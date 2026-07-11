const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

function getDb() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL client error:', err);
    });

    console.log('Connected to PostgreSQL database');
  }

  return pool;
}

async function query(text, params = []) {
  const database = getDb();
  const result = await database.query(text, params);
  return result.rows;
}

async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0];
}

async function initDatabase() {
  const database = getDb();

  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      category VARCHAR(100) NOT NULL,
      monthly_budget NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT uq_budgets_user_category UNIQUE (user_id, category)
    )
  `);

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)
  `);

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)
  `);

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)
  `);

  console.log('Database schema initialized successfully');
}

async function migrateFromJSON() {
  console.log('Skipping JSON migration; no production data needs to be preserved.');
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
}

module.exports = {
  getDb,
  query,
  queryOne,
  initDatabase,
  migrateFromJSON,
  closeDatabase
};
