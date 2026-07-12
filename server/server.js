const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne, initDatabase, migrateFromJSON } = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && JWT_SECRET === 'your-secret-key-change-this-in-production') {
  console.error('ERROR: JWT_SECRET must be set in production environment');
  process.exit(1);
}

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/expenses') ||
    req.path.startsWith('/budgets') ||
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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

app.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    await query(
      'INSERT INTO users (id, name, email, password, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, fullName, email, hashedPassword, createdAt]
    );

    const token = jwt.sign({ id: userId, email, fullName }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        fullName,
        email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, fullName: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
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

app.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read expenses' });
  }
});

app.post('/expenses', authenticateToken, async (req, res) => {
  try {
    const { amount, category, date, note } = req.body;

    if (!amount || !category || !date) {
      return res.status(400).json({ error: 'Amount, category, and date are required' });
    }

    const expenseId = uuidv4();
    const createdAt = new Date().toISOString();

    const rows = await query(
      'INSERT INTO expenses (id, user_id, amount, category, date, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [expenseId, req.user.id, parseFloat(amount), category, date, note || '', createdAt]
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
      updates.push('amount = $' + (values.length + 1));
      values.push(parseFloat(amount));
    }
    if (category) {
      updates.push('category = $' + (values.length + 1));
      values.push(category);
    }
    if (date) {
      updates.push('date = $' + (values.length + 1));
      values.push(date);
    }
    if (note !== undefined) {
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

    if (!category || !monthlyBudget) {
      return res.status(400).json({ error: 'Category and monthly budget are required' });
    }

    const validCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (isNaN(monthlyBudget) || monthlyBudget <= 0) {
      return res.status(400).json({ error: 'Monthly budget must be a positive number' });
    }

    const budgetId = uuidv4();
    const now = new Date().toISOString();

    const existingBudget = await queryOne('SELECT id FROM budgets WHERE user_id = $1 AND category = $2', [req.user.id, category]);
    if (existingBudget) {
      return res.status(400).json({ error: 'Budget already exists for this category' });
    }

    const rows = await query(
      'INSERT INTO budgets (id, user_id, category, monthly_budget, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [budgetId, req.user.id, category, parseFloat(monthlyBudget), now, now]
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

    if (category) {
      const validCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const existingBudget = await queryOne('SELECT id FROM budgets WHERE user_id = $1 AND category = $2 AND id != $3', [req.user.id, category, id]);
      if (existingBudget) {
        return res.status(400).json({ error: 'Budget already exists for this category' });
      }
    }

    if (monthlyBudget !== undefined) {
      if (isNaN(monthlyBudget) || monthlyBudget <= 0) {
        return res.status(400).json({ error: 'Monthly budget must be a positive number' });
      }
    }

    const updates = [];
    const values = [];

    if (category) {
      updates.push('category = $' + (values.length + 1));
      values.push(category);
    }
    if (monthlyBudget !== undefined) {
      updates.push('monthly_budget = $' + (values.length + 1));
      values.push(parseFloat(monthlyBudget));
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

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses WHERE user_id = $1', [req.user.id]);

    if (expenses.length === 0) {
      return res.json({
        totalExpenses: 0,
        averageExpenseAmount: 0,
        highestSingleExpense: 0,
        lowestExpense: 0,
        mostUsedCategory: 'N/A',
        currentMonthSpending: 0,
        previousMonthSpending: 0
      });
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const averageExpenseAmount = totalExpenses / expenses.length;
    const highestSingleExpense = Math.max(...expenses.map((exp) => exp.amount));
    const lowestExpense = Math.min(...expenses.map((exp) => exp.amount));

    const categoryCount = {};
    expenses.forEach((exp) => {
      categoryCount[exp.category] = (categoryCount[exp.category] || 0) + 1;
    });
    const mostUsedCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });
    const currentMonthSpending = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const previousMonthExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === previousMonth && expDate.getFullYear() === previousMonthYear;
    });
    const previousMonthSpending = previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      totalExpenses,
      averageExpenseAmount: parseFloat(averageExpenseAmount.toFixed(2)),
      highestSingleExpense,
      lowestExpense,
      mostUsedCategory,
      currentMonthSpending,
      previousMonthSpending
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

app.get('/analytics/monthly-trends', authenticateToken, async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses WHERE user_id = $1', [req.user.id]);

    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === month && expDate.getFullYear() === year;
      });

      const totalSpending = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      months.push({
        month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
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
    const expenses = await query('SELECT * FROM expenses WHERE user_id = $1', [req.user.id]);

    if (expenses.length === 0) {
      return res.json([]);
    }

    const categorySpending = {};
    expenses.forEach((exp) => {
      if (!categorySpending[exp.category]) {
        categorySpending[exp.category] = 0;
      }
      categorySpending[exp.category] += exp.amount;
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

app.get('/analytics/daily-spending', authenticateToken, async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses WHERE user_id = $1', [req.user.id]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const dailySpending = {};
    currentMonthExpenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      const day = expDate.getDate();
      if (!dailySpending[day]) {
        dailySpending[day] = 0;
      }
      dailySpending[day] += exp.amount;
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      dailyData.push({
        day: `Day ${day}`,
        amount: dailySpending[day] || 0
      });
    }

    const highestSpendingDay = dailyData.reduce((max, day) =>
      day.amount > max.amount ? day : max, { day: 'N/A', amount: 0 });

    const averageDailySpending = currentMonthExpenses.length > 0
      ? currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0) / daysInMonth
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

startServer();
