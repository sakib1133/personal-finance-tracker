const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, initDatabase, migrateFromJSON } = require('./db');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security: Validate JWT_SECRET in production
if (NODE_ENV === 'production' && JWT_SECRET === 'your-secret-key-change-this-in-production') {
  console.error('ERROR: JWT_SECRET must be set in production environment');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));
  console.log('Serving static files from:', clientBuildPath);
}

// GET / - Root route
app.get('/', (req, res) => {
  if (NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    res.send('Expense Tracker API is running');
  }
});

// JWT Authentication Middleware
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

// POST /auth/register - Register a new user
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

    const db = getDb();
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Check if email already exists
    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    
    if (row) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Insert new user
    db.prepare(
      'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, fullName, email, hashedPassword, createdAt);

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

// POST /auth/login - Login user
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

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

// GET /auth/me - Get current user
app.get('/auth/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);

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

// GET /expenses - Get all expenses
app.get('/expenses', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(req.user.id);
    
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read expenses' });
  }
});

// POST /expenses - Create a new expense
app.post('/expenses', authenticateToken, (req, res) => {
  try {
    const { amount, category, date, note } = req.body;
    
    if (!amount || !category || !date) {
      return res.status(400).json({ error: 'Amount, category, and date are required' });
    }

    const db = getDb();
    const expenseId = uuidv4();
    const createdAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    db.prepare(
      'INSERT INTO expenses (id, user_id, amount, category, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(expenseId, req.user.id, parseFloat(amount), category, date, note || '', createdAt);

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /expenses/:id - Update an expense
app.put('/expenses/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, date, note } = req.body;

    const db = getDb();

    // First check if expense exists and belongs to user
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (amount !== undefined) {
      updates.push('amount = ?');
      values.push(parseFloat(amount));
    }
    if (category) {
      updates.push('category = ?');
      values.push(category);
    }
    if (date) {
      updates.push('date = ?');
      values.push(date);
    }
    if (note !== undefined) {
      updates.push('note = ?');
      values.push(note);
    }

    if (updates.length === 0) {
      return res.json(expense);
    }

    values.push(id);

    db.prepare(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`
    ).run(values);

    const updatedExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /expenses/:id - Delete an expense
app.delete('/expenses/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // First check if expense exists and belongs to user
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET /budgets - Get all budgets for current user
app.get('/budgets', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(req.user.id);
    
    // Transform to match expected format
    const transformedBudgets = budgets.map(b => ({
      id: b.id,
      userId: b.user_id,
      category: b.category,
      monthlyBudget: b.monthly_budget,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));
    
    res.json(transformedBudgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read budgets' });
  }
});

// POST /budgets - Create a new budget
app.post('/budgets', authenticateToken, (req, res) => {
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

    const db = getDb();
    const budgetId = uuidv4();
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Check if budget already exists for this category
    const existingBudget = db.prepare(
      'SELECT id FROM budgets WHERE user_id = ? AND category = ?'
    ).get(req.user.id, category);

    if (existingBudget) {
      return res.status(400).json({ error: 'Budget already exists for this category' });
    }

    db.prepare(
      'INSERT INTO budgets (id, user_id, category, monthly_budget, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(budgetId, req.user.id, category, parseFloat(monthlyBudget), now, now);

    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);

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

// PUT /budgets/:id - Update a budget
app.put('/budgets/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { category, monthlyBudget } = req.body;

    const db = getDb();

    // First check if budget exists and belongs to user
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);

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

      // Check if category is already used by another budget
      const existingBudget = db.prepare(
        'SELECT id FROM budgets WHERE user_id = ? AND category = ? AND id != ?'
      ).get(req.user.id, category, id);

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
      updates.push('category = ?');
      values.push(category);
    }
    if (monthlyBudget !== undefined) {
      updates.push('monthly_budget = ?');
      values.push(parseFloat(monthlyBudget));
    }
    updates.push('updated_at = ?');
    values.push(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

    values.push(id);

    db.prepare(
      `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`
    ).run(values);

    const updatedBudget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);

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

// DELETE /budgets/:id - Delete a budget
app.delete('/budgets/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // First check if budget exists and belongs to user
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    if (budget.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
    
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// Analytics Endpoints

// GET /analytics/summary - Get financial insights summary
app.get('/analytics/summary', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(req.user.id);

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
    const highestSingleExpense = Math.max(...expenses.map(exp => exp.amount));
    const lowestExpense = Math.min(...expenses.map(exp => exp.amount));

    const categoryCount = {};
    expenses.forEach(exp => {
      categoryCount[exp.category] = (categoryCount[exp.category] || 0) + 1;
    });
    const mostUsedCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });
    const currentMonthSpending = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const previousMonthExpenses = expenses.filter(exp => {
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

// GET /analytics/monthly-trends - Get monthly spending trends for last 12 months
app.get('/analytics/monthly-trends', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(req.user.id);

    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthExpenses = expenses.filter(exp => {
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

// GET /analytics/category-breakdown - Get category spending breakdown
app.get('/analytics/category-breakdown', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(req.user.id);

    if (expenses.length === 0) {
      return res.json([]);
    }

    const categorySpending = {};
    expenses.forEach(exp => {
      if (!categorySpending[exp.category]) {
        categorySpending[exp.category] = 0;
      }
      categorySpending[exp.category] += exp.amount;
    });

    const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);

    const breakdown = Object.entries(categorySpending).map(([category, amount]) => ({
      category,
      amount,
      percentage: parseFloat(((amount / totalSpending) * 100).toFixed(2))
    })).sort((a, b) => b.amount - a.amount);

    res.json(breakdown);
  } catch (error) {
    console.error('Category breakdown error:', error);
    res.status(500).json({ error: 'Failed to get category breakdown' });
  }
});

// GET /analytics/daily-spending - Get daily spending pattern for current month
app.get('/analytics/daily-spending', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(req.user.id);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const dailySpending = {};
    currentMonthExpenses.forEach(exp => {
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

// SPA Fallback: Serve React app for all non-API routes in production
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't fallback for API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/expenses') || req.path.startsWith('/budgets') || req.path.startsWith('/analytics')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Initialize and start server
console.log(`Starting server in ${NODE_ENV} mode...`);
console.log(`Port: ${PORT}`);

initDatabase();
console.log('Database initialized successfully');

migrateFromJSON().then(() => {
  console.log('Data migration completed');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (NODE_ENV === 'production') {
      console.log('Production mode: Serving React build files');
    }
  });
}).catch(err => {
  console.error('Migration error:', err);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
