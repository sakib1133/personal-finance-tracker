BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    GROUP BY LOWER(REGEXP_REPLACE(email, '^[[:space:]]+|[[:space:]]+$', '', 'g'))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Email normalization would create duplicate accounts; resolve case-insensitive duplicates before applying this migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM expenses
    WHERE amount <= 0 OR amount = 'NaN'::numeric
  ) THEN
    RAISE EXCEPTION 'Expenses contain non-positive or NaN amounts; review these rows before applying this migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM budgets
    WHERE monthly_budget <= 0 OR monthly_budget = 'NaN'::numeric
  ) THEN
    RAISE EXCEPTION 'Budgets contain non-positive or NaN amounts; review these rows before applying this migration';
  END IF;
END
$$;

UPDATE users
SET email = LOWER(REGEXP_REPLACE(email, '^[[:space:]]+|[[:space:]]+$', '', 'g'))
WHERE email <> LOWER(REGEXP_REPLACE(email, '^[[:space:]]+|[[:space:]]+$', '', 'g'));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique_idx
  ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
  ON auth_sessions(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expenses_amount_positive_check'
      AND conrelid = 'expenses'::regclass
  ) THEN
    ALTER TABLE expenses
      ADD CONSTRAINT expenses_amount_positive_check
      CHECK (amount > 0 AND amount <> 'NaN'::numeric) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budgets_monthly_budget_positive_check'
      AND conrelid = 'budgets'::regclass
  ) THEN
    ALTER TABLE budgets
      ADD CONSTRAINT budgets_monthly_budget_positive_check
      CHECK (monthly_budget > 0 AND monthly_budget <> 'NaN'::numeric) NOT VALID;
  END IF;
END
$$;

ALTER TABLE expenses VALIDATE CONSTRAINT expenses_amount_positive_check;
ALTER TABLE budgets VALIDATE CONSTRAINT budgets_monthly_budget_positive_check;

COMMIT;
