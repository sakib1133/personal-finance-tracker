class IdempotencyConflictError extends Error {
  constructor() {
    super('Idempotency key was already used for a different expense');
    this.name = 'IdempotencyConflictError';
    this.statusCode = 409;
  }
}

async function createExpenseIdempotently(pool, { userId, key, requestHash, expense }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const reservation = await client.query(
      `INSERT INTO expense_idempotency (user_id, idempotency_key, request_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, idempotency_key) DO NOTHING
       RETURNING idempotency_key`,
      [userId, key, requestHash]
    );

    if (reservation.rowCount === 0) {
      const existing = await client.query(
        `SELECT request_hash, response
         FROM expense_idempotency
         WHERE user_id = $1 AND idempotency_key = $2`,
        [userId, key]
      );
      const priorRequest = existing.rows[0];
      if (!priorRequest || priorRequest.request_hash !== requestHash) {
        throw new IdempotencyConflictError();
      }
      if (!priorRequest.response) {
        throw new Error('Stored idempotency result is missing');
      }

      await client.query('COMMIT');
      return { expense: priorRequest.response, created: false };
    }

    const inserted = await client.query(
      `INSERT INTO expenses (id, user_id, amount, category, date, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        expense.id,
        userId,
        expense.amount,
        expense.category,
        expense.date,
        expense.note,
        expense.createdAt
      ]
    );
    const createdExpense = inserted.rows[0];

    await client.query(
      `UPDATE expense_idempotency
       SET response = $3
       WHERE user_id = $1 AND idempotency_key = $2`,
      [userId, key, JSON.stringify(createdExpense)]
    );
    await client.query('COMMIT');

    return { expense: createdExpense, created: true };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Expense idempotency transaction failed and could not be rolled back'
      );
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createExpenseIdempotently, IdempotencyConflictError };
