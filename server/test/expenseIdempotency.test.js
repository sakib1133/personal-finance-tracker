const test = require('node:test');
const assert = require('node:assert/strict');
const { createExpenseIdempotently } = require('../expenseIdempotency');

function createFakePool() {
  const reservations = new Map();
  const expenses = new Map();
  let transactionQueue = Promise.resolve();

  return {
    expenses,
    async connect() {
      let releaseTransaction;
      return {
        async query(sql, values = []) {
          const statement = sql.trim().replace(/\s+/g, ' ');
          if (statement === 'BEGIN') {
            const previousTransaction = transactionQueue;
            transactionQueue = new Promise((resolve) => {
              releaseTransaction = resolve;
            });
            await previousTransaction;
            return { rows: [] };
          }
          if (statement === 'COMMIT' || statement === 'ROLLBACK') {
            releaseTransaction();
            return { rows: [] };
          }
          if (statement.startsWith('INSERT INTO expense_idempotency')) {
            const id = `${values[0]}:${values[1]}`;
            if (reservations.has(id)) {
              return { rowCount: 0, rows: [] };
            }
            reservations.set(id, { request_hash: values[2], response: null });
            return { rowCount: 1, rows: [{ idempotency_key: values[1] }] };
          }
          if (statement.startsWith('SELECT request_hash, response')) {
            const prior = reservations.get(`${values[0]}:${values[1]}`);
            return { rowCount: prior ? 1 : 0, rows: prior ? [prior] : [] };
          }
          if (statement.startsWith('INSERT INTO expenses')) {
            const [id, userId, amount, category, date, note, createdAt] = values;
            const expense = {
              id,
              user_id: userId,
              amount: String(amount),
              category,
              date,
              note,
              created_at: createdAt
            };
            expenses.set(id, expense);
            return { rowCount: 1, rows: [expense] };
          }
          if (statement.startsWith('UPDATE expense_idempotency')) {
            reservations.get(`${values[0]}:${values[1]}`).response = JSON.parse(values[2]);
            return { rowCount: 1, rows: [] };
          }
          throw new Error(`Unexpected SQL in idempotency test: ${statement}`);
        },
        release() {}
      };
    }
  };
}

const request = (overrides = {}) => ({
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  key: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  requestHash: 'a'.repeat(64),
  expense: {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    amount: 12.34,
    category: 'Food',
    date: '2026-10-27',
    note: '1,000',
    createdAt: '2026-10-27T00:00:00.000Z'
  },
  ...overrides
});

test('concurrent retries with one user/key create only one expense and replay its result', async () => {
  const pool = createFakePool();
  const [first, retry] = await Promise.all([
    createExpenseIdempotently(pool, request()),
    createExpenseIdempotently(pool, request({
      expense: { ...request().expense, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }
    }))
  ]);

  assert.equal(pool.expenses.size, 1);
  assert.equal(first.expense.id, retry.expense.id);
  assert.deepEqual([first.created, retry.created].sort(), [false, true]);
  assert.equal(retry.expense.note, '1,000');
});

test('reusing an idempotency key with a different payload is rejected', async () => {
  const pool = createFakePool();
  await createExpenseIdempotently(pool, request());

  await assert.rejects(
    createExpenseIdempotently(pool, request({
      requestHash: 'b'.repeat(64),
      expense: { ...request().expense, amount: 99 }
    })),
    { statusCode: 409 }
  );
  assert.equal(pool.expenses.size, 1);
});
