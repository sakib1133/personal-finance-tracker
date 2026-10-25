const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { query, queryOne, initDatabase, migrateFromJSON } = require('./db');
const { normalizeResponseData } = require('./normalizeData');
const { isDailySpendingRangeWithinLimit } = require('./analyticsDateRange');
const { normalizeEmail } = require('./email');
const { parsePositiveAmount } = require('./expenseValidation');
const { SESSION_LIFETIME_MS, signSessionToken, verifySessionToken } = require('./authTokens');
const { getSessionCookieName, getSessionCookieOptions, readCookie } = require('./sessionCookie');

require('dotenv').config();

const app = express();
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet());
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again later.'
  }
});
const googleLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many Google sign-in attempts. Please try again later.'
  }
});

const dailySpendingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many analytics requests. Please try again later.'
  }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many registration attempts. Please try again later.'
  }
});
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleOAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const SESSION_COOKIE_NAME = getSessionCookieName(IS_PRODUCTION);
const SESSION_COOKIE_OPTIONS = getSessionCookieOptions(IS_PRODUCTION);
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  console.error('ERROR: JWT_SECRET must contain at least 32 bytes of random data');
  process.exit(1);
}

const normalizeOrigin = (value) => (value || '').replace(/\/+$/, '');
const allowedOrigins = [
  ...(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
].map(normalizeOrigin);
const allowedOriginSet = new Set(allowedOrigins);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return allowedOriginSet.has(normalizeOrigin(origin));
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Cache-Control', 'Pragma', 'Expires']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '16kb' }));

app.use((req, res, next) => {
  if (req.body === undefined) {
    req.body = {};
  } else if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  next();
});

app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers.origin &&
      !isAllowedOrigin(req.headers.origin)) {
    return res.status(403).json({ error: 'Request origin is not allowed' });
  }

  next();
});

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(normalizeResponseData(body));
  next();
});

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    req.url = req.originalUrl.replace(/^\/api/, '');
  }
  next();
});

app.use((req, res, next) => {
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/expenses') ||
    req.path.startsWith('/budgets') ||
    req.path.startsWith('/analytics') ||
    req.path.startsWith('/auth')
  ) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': 'false'
    });
  }
  next();
});


app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Expense Tracker API Running'
  });
});

const authenticateToken = (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE_NAME);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let payload;
  try {
    payload = verifySessionToken(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  queryOne(
    'SELECT id FROM auth_sessions WHERE id = $1 AND user_id = $2 AND expires_at > NOW()',
    [payload.jti, payload.sub]
  ).then((session) => {
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      sessionId: payload.jti
    };
    next();
  }).catch(next);
};

const createSession = async (user, res) => {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await query(
    'INSERT INTO auth_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [sessionId, user.id, expiresAt.toISOString()]
  );

  const token = signSessionToken(user, sessionId, JWT_SECRET);
  res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
};

const clearSessionCookie = (res) => {
  const { maxAge, ...clearOptions } = SESSION_COOKIE_OPTIONS;
  res.clearCookie(SESSION_COOKIE_NAME, clearOptions);
};

app.post('/auth/register', registerLimiter, async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (
      typeof fullName !== 'string' ||
      !fullName.trim() ||
      fullName.trim().length > 255 ||
      typeof password !== 'string' ||
      typeof confirmPassword !== 'string'
    ) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const passwordLength = Array.from(password).length;
    if (passwordLength < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Password must be no more than 72 UTF-8 bytes' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    const existingUser = await queryOne(
      'SELECT id FROM users WHERE LOWER(BTRIM(email)) = $1',
      [normalizedEmail]
    );
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    await query(
      'INSERT INTO users (id, name, email, password, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, fullName.trim(), normalizedEmail, hashedPassword, createdAt]
    );

    const user = { id: userId, email: normalizedEmail, name: fullName.trim() };
    await createSession(user, res);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        fullName: user.name,
        email: user.email
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedEmail ||
      typeof password !== 'string' ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await queryOne(
      'SELECT * FROM users WHERE LOWER(BTRIM(email)) = $1',
      [normalizedEmail]
    );
    if (!user || typeof user.password !== 'string') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await createSession(user, res);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/auth/google', googleLoginLimiter, async (req, res) => {
  if (!googleOAuthClient || !GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not configured on the server' });
  }

  const { credential } = req.body || {};
  if (typeof credential !== 'string' || credential.length > 10000) {
    return res.status(400).json({ error: 'A valid Google credential is required' });
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }

  if (
    !payload ||
    payload.aud !== GOOGLE_CLIENT_ID ||
    payload.email_verified !== true ||
    typeof payload.email !== 'string' ||
    !payload.email ||
    typeof payload.sub !== 'string' ||
    !payload.sub
  ) {
    return res.status(401).json({ error: 'Google sign-in requires a verified Google email' });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return res.status(401).json({ error: 'Google sign-in requires a valid verified email' });
  }
  const fullName = (typeof payload.name === 'string' && payload.name.trim())
    ? payload.name.trim().slice(0, 255)
    : email.split('@')[0].slice(0, 255);

  try {
    let user = await queryOne(
      'SELECT id, name, email FROM users WHERE google_sub = $1',
      [payload.sub]
    );

    if (!user) {
      const existingEmail = await queryOne(
        'SELECT id FROM users WHERE LOWER(BTRIM(email)) = $1',
        [email]
      );
      if (existingEmail) {
        return res.status(409).json({
          error: 'An account with this email already exists. Sign in with your password; Google sign-in was not linked.'
        });
      }

      try {
        user = await queryOne(
          `INSERT INTO users (id, name, email, password, google_sub, created_at)
           VALUES ($1, $2, $3, NULL, $4, $5)
           RETURNING id, name, email`,
          [uuidv4(), fullName, email, payload.sub, new Date().toISOString()]
        );
      } catch (error) {
        if (error.code !== '23505') {
          throw error;
        }

        user = await queryOne(
          'SELECT id, name, email FROM users WHERE google_sub = $1',
          [payload.sub]
        );
        if (!user) {
          return res.status(409).json({
            error: 'An account with this email already exists. Sign in with your password; Google sign-in was not linked.'
          });
        }
      }
    }

    await createSession(user, res);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: 'Failed to sign in with Google' });
  }
});

app.post('/auth/logout', authenticateToken, async (req, res, next) => {
  try {
    await query('DELETE FROM auth_sessions WHERE id = $1', [req.user.sessionId]);
    clearSessionCookie(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      fullName: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.get('/expenses', authenticateToken, async (req,
   res) => {
  try {
    const expenses = await query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read expenses' });
  }
});

const isValidISODate = (dateValue) => {
  if (typeof dateValue !== 'string') return false;
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;
  const d = new Date(dateValue + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateValue;
};

const isFutureDate = (dateValue) => {
  const d = new Date(dateValue + 'T00:00:00Z');
  const now = new Date();
  // Compare only by date (UTC)
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d.getTime() > todayUTC.getTime();
};

const getAnalyticsDateRange = (req, res) => {
  const { startDate, endDate } = req.query;

  if (startDate === undefined && endDate === undefined) {
    return null;
  }

  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    res.status(400).json({ error: 'Both startDate and endDate must use YYYY-MM-DD format' });
    return undefined;
  }

  if (startDate > endDate) {
    res.status(400).json({ error: 'startDate must be on or before endDate' });
    return undefined;
  }

  return { startDate, endDate };
};

const getAnalyticsExpenses = (userId, dateRange) => {
  if (!dateRange) {
    return query('SELECT * FROM expenses WHERE user_id = $1', [userId]);
  }

  return query(
    'SELECT * FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3',
    [userId, dateRange.startDate, dateRange.endDate]
  );
};

const getMonthStartDate = (date, monthOffset = 0) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year').value);
  const month = Number(parts.find((part) => part.type === 'month').value);
  return new Date(Date.UTC(year, month - 1 + monthOffset, 1)).toISOString().slice(0, 10);
};

const getPreviousDateRange = ({ startDate, endDate }) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const daysInRange = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - daysInRange + 1);

  return {
    startDate: previousStart.toISOString().slice(0, 10),
    endDate: previousEnd.toISOString().slice(0, 10)
  };
};

app.post('/expenses', authenticateToken, async (req, res) => {
  try {
    const { amount, category, date, note } = req.body;
    const parsedAmount = parsePositiveAmount(amount);
    const validCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

    if (parsedAmount === null || !category || !date) {
      return res.status(400).json({ error: 'Amount, category, and date are required' });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) {
      return res.status(400).json({ error: 'Note must be text of at most 2000 characters' });
    }

    if (!isValidISODate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    if (isFutureDate(date)) {
      return res.status(400).json({ error: 'Date cannot be in the future' });
    }

    const expenseId = uuidv4();
    const createdAt = new Date().toISOString();

    const rows = await query(
      'INSERT INTO expenses (id, user_id, amount, category, date, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [expenseId, req.user.id, parsedAmount, category, date, note || '', createdAt]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.put('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, date, note } = req.body;

    const expense = await queryOne('SELECT * FROM expenses WHERE id = $1', [id]);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];

    if (amount !== undefined) {
      const parsedAmount = parsePositiveAmount(amount);
      if (parsedAmount === null) {
        return res.status(400).json({
          error: 'Amount must be a positive number with up to two decimal places'
        });
      }
      updates.push('amount = $' + (values.length + 1));
      values.push(parsedAmount);
    }
    if (category !== undefined) {
      const validCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      updates.push('category = $' + (values.length + 1));
      values.push(category);
    }
    if (date !== undefined) {
      if (typeof date !== 'string' || !date) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }
      if (!isValidISODate(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      if (isFutureDate(date)) {
        return res.status(400).json({ error: 'Date cannot be in the future' });
      }

      updates.push('date = $' + (values.length + 1));
      values.push(date);
    }
    if (note !== undefined) {
      if (typeof note !== 'string' || note.length > 2000) {
        return res.status(400).json({ error: 'Note must be text of at most 2000 characters' });
      }
      updates.push('note = $' + (values.length + 1));
      values.push(note);
    }

    if (updates.length === 0) {
      return res.json(expense);
    }

    values.push(id);
    const rows = await query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await queryOne('SELECT * FROM expenses WHERE id = $1', [id]);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM expenses WHERE id = $1', [id]);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.get('/budgets', authenticateToken, async (req, res) => {
  try {
    const budgets = await query('SELECT * FROM budgets WHERE user_id = $1', [req.user.id]);

    const transformedBudgets = budgets.map((budget) => ({
      id: budget.id,
      userId: budget.user_id,
      category: budget.category,
      monthlyBudget: budget.monthly_budget,
      createdAt: budget.created_at,
      updatedAt: budget.updated_at
    }));

    res.json(transformedBudgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read budgets' });
  }
});

app.post('/budgets', authenticateToken, async (req, res) => {
  try {
    const { category, monthlyBudget } = req.body;
    const parsedBudget = parsePositiveAmount(monthlyBudget);

    if (!category || parsedBudget === null) {
      return res.status(400).json({ error: 'Category and monthly budget are required' });
    }

    const validCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const budgetId = uuidv4();
    const now = new Date().toISOString();

    const existingBudget = await queryOne('SELECT id FROM budgets WHERE user_id = $1 AND category = $2', [req.user.id, category]);
    if (existingBudget) {
      return res.status(400).json({ error: 'Budget already exists for this category' });
    }

    const rows = await query(
      'INSERT INTO budgets (id, user_id, category, monthly_budget, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [budgetId, req.user.id, category, parsedBudget, now, now]
    );

    const budget = rows[0];
    const transformedBudget = {
      id: budget.id,
      userId: budget.user_id,
      category: budget.category,
      monthlyBudget: budget.monthly_budget,
      createdAt: budget.created_at,
      updatedAt: budget.updated_at
    };

    res.status(201).json(transformedBudget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

app.put('/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, monthlyBudget } = req.body;

    const budget = await queryOne('SELECT * FROM budgets WHERE id = $1', [id]);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    if (budget.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (category !== undefined) {
      const validCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const existingBudget = await queryOne('SELECT id FROM budgets WHERE user_id = $1 AND category = $2 AND id != $3', [req.user.id, category, id]);
      if (existingBudget) {
        return res.status(400).json({ error: 'Budget already exists for this category' });
      }
    }

    let parsedBudget;
    if (monthlyBudget !== undefined) {
      parsedBudget = parsePositiveAmount(monthlyBudget);
      if (parsedBudget === null) {
        return res.status(400).json({
          error: 'Monthly budget must be a positive number with up to two decimal places'
        });
      }
    }

    const updates = [];
    const values = [];

    if (category !== undefined) {
      updates.push('category = $' + (values.length + 1));
      values.push(category);
    }
    if (monthlyBudget !== undefined) {
      updates.push('monthly_budget = $' + (values.length + 1));
      values.push(parsedBudget);
    }
    updates.push('updated_at = $' + (values.length + 1));
    values.push(new Date().toISOString());

    values.push(id);
    const rows = await query(`UPDATE budgets SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    const updatedBudget = rows[0];

    const transformedBudget = {
      id: updatedBudget.id,
      userId: updatedBudget.user_id,
      category: updatedBudget.category,
      monthlyBudget: updatedBudget.monthly_budget,
      createdAt: updatedBudget.created_at,
      updatedAt: updatedBudget.updated_at
    };

    res.json(transformedBudget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

app.delete('/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await queryOne('SELECT * FROM budgets WHERE id = $1', [id]);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    if (budget.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM budgets WHERE id = $1', [id]);

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'expense-tracker-api' });
});

app.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const dateRange = getAnalyticsDateRange(req, res);
    if (dateRange === undefined) return;

    const now = new Date();
    const currentMonthStart = getMonthStartDate(now);
    const nextMonthStart = getMonthStartDate(now, 1);
    const previousMonthStart = getMonthStartDate(now, -1);
    const previousDateRange = dateRange ? getPreviousDateRange(dateRange) : null;
    const [expenses, monthSpending, previousPeriodSpending] = await Promise.all([
      getAnalyticsExpenses(req.user.id, dateRange),
      queryOne(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE date >= $2 AND date < $3), 0) AS current_month_spending,
          COALESCE(SUM(amount) FILTER (WHERE date >= $4 AND date < $2), 0) AS previous_month_spending
        FROM expenses
        WHERE user_id = $1 AND date >= $4 AND date < $3`,
        [
          req.user.id,
          currentMonthStart,
          nextMonthStart,
          previousMonthStart
        ]
      ),
      previousDateRange
        ? queryOne(
            'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3',
            [req.user.id, previousDateRange.startDate, previousDateRange.endDate]
          )
        : Promise.resolve(null)
    ]);

    const previousPeriodTotal = previousDateRange
      ? toNumber(previousPeriodSpending.total)
      : toNumber(monthSpending.previous_month_spending);

    if (expenses.length === 0) {
      return res.json({
        totalExpenses: 0,
        averageExpenseAmount: 0,
        highestSingleExpense: 0,
        lowestExpense: 0,
        mostUsedCategory: 'N/A',
        currentMonthSpending: toNumber(monthSpending.current_month_spending),
        previousMonthSpending: toNumber(monthSpending.previous_month_spending),
        selectedPeriodSpending: 0,
        previousPeriodSpending: previousPeriodTotal
      });
    }

    const totalExpenses = expenses.reduce(
  (sum, exp) => sum + toNumber(exp.amount),
  0
);
    const averageExpenseAmount = totalExpenses / expenses.length;
    const highestSingleExpense = Math.max(
  ...expenses.map((exp) => toNumber(exp.amount))
);

const lowestExpense = Math.min(
  ...expenses.map((exp) => toNumber(exp.amount))
);




    const categoryCount = {};

    expenses.forEach((exp) => {
      categoryCount[exp.category] = (categoryCount[exp.category] || 0) + 1;
    });
    const mostUsedCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0];

    res.json({
      totalExpenses,
      averageExpenseAmount: parseFloat(averageExpenseAmount.toFixed(2)),
      highestSingleExpense,
      lowestExpense,
      mostUsedCategory,
      currentMonthSpending: toNumber(monthSpending.current_month_spending),
      previousMonthSpending: toNumber(monthSpending.previous_month_spending),
      selectedPeriodSpending: totalExpenses,
      previousPeriodSpending: previousPeriodTotal
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

app.get('/analytics/monthly-trends', authenticateToken, async (req, res) => {
  try {
    const dateRange = getAnalyticsDateRange(req, res);
    if (dateRange === undefined) return;

    const expenses = await getAnalyticsExpenses(req.user.id, dateRange);

    const months = [];
    const now = new Date();
    const startDate = dateRange
      ? new Date(`${dateRange.startDate}T00:00:00Z`)
      : new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1));
    const endDate = dateRange
      ? new Date(`${dateRange.endDate}T00:00:00Z`)
      : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    for (
      let date = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
      date <= endDate;
      date.setUTCMonth(date.getUTCMonth() + 1)
    ) {
      const monthKey = date.toISOString().slice(0, 7);

      const monthExpenses = expenses.filter((exp) => {
        return String(exp.date).slice(0, 7) === monthKey;
      });

      const totalSpending = monthExpenses.reduce(
        (sum, exp) => sum + toNumber(exp.amount),
        0
      );

      months.push({
        month: date.toLocaleString('default', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
        totalSpending
      });
    }

    res.json(months);
  } catch (error) {
    console.error('Monthly trends error:', error);
    res.status(500).json({ error: 'Failed to get monthly trends' });
  }
});

app.get('/analytics/category-breakdown', authenticateToken, async (req, res) => {
  try {
    const dateRange = getAnalyticsDateRange(req, res);
    if (dateRange === undefined) return;

    const expenses = await getAnalyticsExpenses(req.user.id, dateRange);

    if (expenses.length === 0) {
      return res.json([]);
    }

    const categorySpending = {};
    expenses.forEach((exp) => {
      if (!categorySpending[exp.category]) {
        categorySpending[exp.category] = 0;
      }
        categorySpending[exp.category] += toNumber(exp.amount);

    });

    const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);

    const breakdown = Object.entries(categorySpending)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: parseFloat(((amount / totalSpending) * 100).toFixed(2))
      }))
      .sort((a, b) => b.amount - a.amount);

    res.json(breakdown);
  } catch (error) {
    console.error('Category breakdown error:', error);
    res.status(500).json({ error: 'Failed to get category breakdown' });
  }
});

app.get('/analytics/daily-spending', authenticateToken, dailySpendingLimiter, async (req, res) => {
  try {
    const dateRange = getAnalyticsDateRange(req, res);
    if (dateRange === undefined) return;

    if (dateRange && !isDailySpendingRangeWithinLimit(dateRange)) {
      return res.status(400).json({
        error: 'Daily spending date range cannot exceed 367 days'
      });
    }

    const expenses = await getAnalyticsExpenses(req.user.id, dateRange);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const rangeStart = dateRange
      ? new Date(`${dateRange.startDate}T00:00:00Z`)
      : new Date(Date.UTC(currentYear, currentMonth, 1));
    const rangeEnd = dateRange
      ? new Date(`${dateRange.endDate}T00:00:00Z`)
      : new Date(Date.UTC(currentYear, currentMonth + 1, 0));
    const currentMonthExpenses = dateRange
      ? expenses
      : expenses.filter((exp) => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });

    const dailySpending = {};
    currentMonthExpenses.forEach((exp) => {
      const dateKey = String(exp.date).slice(0, 10);
      if (!dailySpending[dateKey]) {
        dailySpending[dateKey] = 0;
      }
      dailySpending[dateKey] += toNumber(exp.amount);
    });

    const dailyData = [];
    const daysInRange = Math.floor((rangeEnd - rangeStart) / (24 * 60 * 60 * 1000)) + 1;

    for (let dayOffset = 0; dayOffset < daysInRange; dayOffset++) {
      const date = new Date(rangeStart);
      date.setUTCDate(date.getUTCDate() + dayOffset);
      const dateKey = date.toISOString().slice(0, 10);
      dailyData.push({
        day: dateRange
          ? date.toLocaleDateString('default', { month: 'short', day: 'numeric', timeZone: 'UTC' })
          : `Day ${date.getUTCDate()}`,
        amount: dailySpending[dateKey] || 0
      });
    }

    const highestSpendingDay = dailyData.reduce((max, day) =>
      day.amount > max.amount ? day : max, { day: 'N/A', amount: 0 });

    const averageDailySpending = currentMonthExpenses.length > 0
      ? currentMonthExpenses.reduce(
        (sum, exp) => sum + toNumber(exp.amount),
        0
      ) / daysInRange
      : 0;


    res.json({
      dailyData,
      highestSpendingDay,
      averageDailySpending: parseFloat(averageDailySpending.toFixed(2))
    });
  } catch (error) {
    console.error('Daily spending error:', error);
    res.status(500).json({ error: 'Failed to get daily spending' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  if (error.status === 400 || error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Request origin is not allowed' });
  }

  console.error('Unhandled request error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    console.log(`Starting server in ${NODE_ENV} mode...`);
    console.log(`Port: ${PORT}`);

    await initDatabase();
    await migrateFromJSON();

    app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
     console.log('Backend API started successfully');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
