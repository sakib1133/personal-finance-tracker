const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs').promises;

// Use persistent disk path on Render, local path for development
const DB_PATH = path.join(__dirname, 'expense_tracker.db');
let db = null;

// Get database connection (singleton pattern)
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    console.log('Connected to SQLite database');
  }
  return db;
}

// Initialize database schema
function initDatabase() {
  const database = getDb();
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      monthly_budget REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, category)
    )
  `);

  // Create indexes for better query performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)
  `);

  console.log('Database schema initialized successfully');
}

// Migrate data from JSON files to SQLite
async function migrateFromJSON() {
  const dataDir = path.join(__dirname, 'data');
  
  try {
    // Check if JSON files exist
    const usersPath = path.join(dataDir, 'users.json');
    const expensesPath = path.join(dataDir, 'expenses.json');
    const budgetsPath = path.join(dataDir, 'budgets.json');
    
    let users = [];
    let expenses = [];
    let budgets = [];
    
    try {
      const usersData = await fs.readFile(usersPath, 'utf8');
      users = JSON.parse(usersData);
    } catch (err) {
      console.log('No users.json file found or empty, skipping migration');
    }
    
    try {
      const expensesData = await fs.readFile(expensesPath, 'utf8');
      expenses = JSON.parse(expensesData);
    } catch (err) {
      console.log('No expenses.json file found or empty, skipping migration');
    }
    
    try {
      const budgetsData = await fs.readFile(budgetsPath, 'utf8');
      budgets = JSON.parse(budgetsData);
    } catch (err) {
      console.log('No budgets.json file found or empty, skipping migration');
    }
    
    if (users.length === 0 && expenses.length === 0 && budgets.length === 0) {
      console.log('No data to migrate');
      return;
    }
    
    const database = getDb();
    
    // Migrate users
    if (users.length > 0) {
      console.log(`Migrating ${users.length} users...`);
      const stmt = database.prepare(
        `INSERT OR IGNORE INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)`
      );
      for (const user of users) {
        stmt.run(user.id, user.fullName, user.email, user.password, user.createdAt);
      }
      console.log('Users migration completed');
    }
    
    // Migrate expenses
    if (expenses.length > 0) {
      console.log(`Migrating ${expenses.length} expenses...`);
      const stmt = database.prepare(
        `INSERT OR IGNORE INTO expenses (id, user_id, amount, category, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const expense of expenses) {
        stmt.run(expense.id, expense.userId, expense.amount, expense.category, expense.date, expense.note, expense.createdAt);
      }
      console.log('Expenses migration completed');
    }
    
    // Migrate budgets
    if (budgets.length > 0) {
      console.log(`Migrating ${budgets.length} budgets...`);
      const stmt = database.prepare(
        `INSERT OR IGNORE INTO budgets (id, user_id, category, monthly_budget, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const budget of budgets) {
        stmt.run(budget.id, budget.userId, budget.category, budget.monthlyBudget, budget.createdAt, budget.updatedAt);
      }
      console.log('Budgets migration completed');
    }
    
    console.log('Data migration completed successfully');
    
    // Backup JSON files by renaming them
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    try {
      await fs.rename(usersPath, `${usersPath}.backup-${timestamp}`);
    } catch (err) {
      // Ignore if file doesn't exist
    }
    try {
      await fs.rename(expensesPath, `${expensesPath}.backup-${timestamp}`);
    } catch (err) {
      // Ignore if file doesn't exist
    }
    try {
      await fs.rename(budgetsPath, `${budgetsPath}.backup-${timestamp}`);
    } catch (err) {
      // Ignore if file doesn't exist
    }
    
    console.log('JSON files backed up successfully');
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Close database connection
function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database connection closed');
    db = null;
  }
}

module.exports = {
  getDb,
  initDatabase,
  migrateFromJSON,
  closeDatabase
};
