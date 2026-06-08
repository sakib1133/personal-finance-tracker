const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

// Use persistent disk path on Render, local path for development
const DB_PATH = process.env.RENDER ? 
  path.join('/opt/render/project/data', 'expense_tracker.db') : 
  path.join(__dirname, 'expense_tracker.db');

let db;

// Get database connection
function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

// Initialize database schema
async function initDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDb();
    
    database.serialize(() => {
      // Create users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        }
      });

      // Create expenses table
      database.run(`
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
      `, (err) => {
        if (err) {
          console.error('Error creating expenses table:', err.message);
          reject(err);
          return;
        }
      });

      // Create budgets table
      database.run(`
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
      `, (err) => {
        if (err) {
          console.error('Error creating budgets table:', err.message);
          reject(err);
          return;
        }
      });

      // Create indexes for better query performance
      database.run(`
        CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)
      `, (err) => {
        if (err) {
          console.error('Error creating expenses user_id index:', err.message);
        }
      });

      database.run(`
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)
      `, (err) => {
        if (err) {
          console.error('Error creating expenses date index:', err.message);
        }
      });

      database.run(`
        CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)
      `, (err) => {
        if (err) {
          console.error('Error creating budgets user_id index:', err.message);
        }
      });

      console.log('Database schema initialized successfully');
      resolve();
    });
  });
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
      for (const user of users) {
        await new Promise((resolve, reject) => {
          database.run(
            `INSERT OR IGNORE INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)`,
            [user.id, user.fullName, user.email, user.password, user.createdAt],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('Users migration completed');
    }
    
    // Migrate expenses
    if (expenses.length > 0) {
      console.log(`Migrating ${expenses.length} expenses...`);
      for (const expense of expenses) {
        await new Promise((resolve, reject) => {
          database.run(
            `INSERT OR IGNORE INTO expenses (id, user_id, amount, category, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [expense.id, expense.userId, expense.amount, expense.category, expense.date, expense.note, expense.createdAt],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('Expenses migration completed');
    }
    
    // Migrate budgets
    if (budgets.length > 0) {
      console.log(`Migrating ${budgets.length} budgets...`);
      for (const budget of budgets) {
        await new Promise((resolve, reject) => {
          database.run(
            `INSERT OR IGNORE INTO budgets (id, user_id, category, monthly_budget, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [budget.id, budget.userId, budget.category, budget.monthlyBudget, budget.createdAt, budget.updatedAt],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
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
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = {
  getDb,
  initDatabase,
  migrateFromJSON,
  closeDatabase
};
