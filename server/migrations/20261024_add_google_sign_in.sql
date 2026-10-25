BEGIN;

ALTER TABLE users
  ALTER COLUMN password DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
  ON users (google_sub);

COMMIT;
