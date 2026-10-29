const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { signSessionToken } = require('../authTokens');
const { getIndiaDateString } = require('../analyticsDateRange');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(32).toString('hex');

const database = require('../db');
const firstUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'First User',
  email: 'first@example.com'
};
const secondUser = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Second User',
  email: 'second@example.com'
};
const sessions = new Map();
const expenses = new Map();
const budgets = new Map();
const idempotency = new Map();

const makeSessionCookie = (user, sessionId) => {
  sessions.set(sessionId, {
    id: sessionId,
    user_id: user.id,
    expires_at: new Date(Date.now() + 60_000).toISOString()
  });
  const token = signSessionToken(user, sessionId, process.env.JWT_SECRET);
  return `pft_session=${encodeURIComponent(token)}`;
};

const firstCookie = makeSessionCookie(firstUser, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const secondCookie = makeSessionCookie(secondUser, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');

database.queryOne = async (sql, values = []) => {
  if (sql.includes('FROM auth_sessions')) {
    const session = sessions.get(values[0]);
    return session?.user_id === values[1] && Date.parse(session.expires_at) > Date.now()
      ? session
      : undefined;
  }
  if (sql.includes('FROM expenses') && sql.includes('user_id = $2')) {
    const expense = expenses.get(values[0]);
    return expense?.user_id === values[1] ? expense : undefined;
  }
  if (sql.includes('FROM budgets') && sql.includes('id != $3')) {
    return [...budgets.values()].find((budget) =>
      budget.user_id === values[0] &&
      budget.category === values[1] &&
      budget.id !== values[2]
    );
  }
  if (sql.includes('FROM budgets') && sql.includes('category = $2')) {
    return [...budgets.values()].find((budget) =>
      budget.user_id === values[0] && budget.category === values[1]
    );
  }
  if (sql.includes('FROM budgets') && sql.includes('id = $1')) {
    const budget = budgets.get(values[0]);
    return budget?.user_id === values[1] ? budget : undefined;
  }
  return undefined;
};

database.query = async (sql, values = []) => {
  if (sql.includes('SELECT * FROM expenses WHERE user_id = $1')) {
    return [...expenses.values()].filter((expense) => expense.user_id === values[0]);
  }
  if (sql.includes('SELECT * FROM budgets WHERE user_id = $1')) {
    return [...budgets.values()].filter((budget) => budget.user_id === values[0]);
  }
  if (sql.startsWith('DELETE FROM expenses')) {
    const expense = expenses.get(values[0]);
    if (!expense || expense.user_id !== values[1]) return [];
    expenses.delete(values[0]);
    return [{ id: values[0] }];
  }
  if (sql.startsWith('DELETE FROM budgets')) {
    const budget = budgets.get(values[0]);
    if (!budget || budget.user_id !== values[1]) return [];
    budgets.delete(values[0]);
    return [{ id: values[0] }];
  }
  if (sql.startsWith('UPDATE expenses')) {
    const id = values[values.length - 2];
    const userId = values[values.length - 1];
    const expense = expenses.get(id);
    if (!expense || expense.user_id !== userId) return [];
    const assignments = sql.match(/SET (.+?) WHERE/)[1].split(', ');
    for (const assignment of assignments) {
      const [, column, position] = assignment.match(/^(\w+) = \$(\d+)$/);
      expense[column] = values[Number(position) - 1];
    }
    return [expense];
  }
  if (sql.startsWith('UPDATE budgets')) {
    const id = values[values.length - 2];
    const userId = values[values.length - 1];
    const budget = budgets.get(id);
    if (!budget || budget.user_id !== userId) return [];
    const assignments = sql.match(/SET (.+?) WHERE/)[1].split(', ');
    for (const assignment of assignments) {
      const [, column, position] = assignment.match(/^(\w+) = \$(\d+)$/);
      budget[column] = values[Number(position) - 1];
    }
    return [budget];
  }
  if (sql.startsWith('INSERT INTO budgets')) {
    const [id, userId, category, monthlyBudget, createdAt, updatedAt] = values;
    if ([...budgets.values()].some((budget) => budget.user_id === userId && budget.category === category)) {
      const duplicateError = new Error('duplicate budget');
      duplicateError.code = '23505';
      throw duplicateError;
    }
    const budget = {
      id,
      user_id: userId,
      category,
      monthly_budget: String(monthlyBudget),
      created_at: createdAt,
      updated_at: updatedAt
    };
    budgets.set(id, budget);
    return [budget];
  }
  return [];
};

database.createIdempotentExpense = async ({ userId, key, requestHash, expense }) => {
  const id = `${userId}:${key}`;
  const existing = idempotency.get(id);
  if (existing) {
    if (existing.requestHash !== requestHash) {
      const conflict = new Error('Idempotency key payload conflict');
      conflict.statusCode = 409;
      throw conflict;
    }
    return { expense: existing.expense, created: false };
  }

  const createdExpense = {
    id: expense.id,
    user_id: userId,
    amount: String(expense.amount),
    category: expense.category,
    date: expense.date,
    note: expense.note,
    created_at: expense.createdAt
  };
  expenses.set(createdExpense.id, createdExpense);
  idempotency.set(id, { requestHash, expense: createdExpense });
  return { expense: createdExpense, created: true };
};

const foreignExpense = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  user_id: secondUser.id,
  amount: '10.00',
  category: 'Food',
  date: getIndiaDateString(),
  note: 'other user',
  created_at: new Date().toISOString()
};
const foreignBudget = {
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  user_id: secondUser.id,
  category: 'Food',
  monthly_budget: '100.00',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
expenses.set(foreignExpense.id, foreignExpense);
budgets.set(foreignBudget.id, foreignBudget);

const { app } = require('../server');
let server;
let baseUrl;

const send = (path, { method = 'GET', body, key, cookie = firstCookie } = {}) => {
  const headers = { Cookie: cookie };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (key) headers['Idempotency-Key'] = key;
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
};

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('expense CRUD is owner-scoped and list results never include another user', async () => {
  const foreignUpdate = await send(`/expenses/${foreignExpense.id}`, {
    method: 'PUT',
    body: { note: 'unauthorized' }
  });
  assert.equal(foreignUpdate.status, 404);
  assert.equal(foreignExpense.note, 'other user');

  const foreignDelete = await send(`/expenses/${foreignExpense.id}`, { method: 'DELETE' });
  assert.equal(foreignDelete.status, 404);
  assert.equal(expenses.has(foreignExpense.id), true);

  const list = await send('/expenses');
  assert.deepEqual((await list.json()).map((expense) => expense.user_id), []);
});

test('expense creation validates amount boundaries and supports safe retries and separate records', async () => {
  const today = getIndiaDateString();
  const key = '12121212-1212-4212-8212-121212121212';
  const payload = { amount: '0.10', category: 'Food', date: today, note: '1234' };
  const before = expenses.size;

  const [created, retry] = await Promise.all([
    send('/expenses', { method: 'POST', body: payload, key }),
    send('/expenses', { method: 'POST', body: payload, key })
  ]);
  assert.equal(created.status, 201);
  assert.equal(retry.status, 201);
  assert.equal((await created.json()).id, (await retry.json()).id);
  assert.equal(expenses.size, before + 1);

  const distinct = await send('/expenses', {
    method: 'POST',
    body: payload,
    key: '13131313-1313-4313-8313-131313131313'
  });
  assert.equal(distinct.status, 201);
  assert.equal(expenses.size, before + 2);

  const conflictingRetry = await send('/expenses', {
    method: 'POST',
    body: { ...payload, amount: '0.11' },
    key
  });
  assert.equal(conflictingRetry.status, 409);

  for (const amount of ['-1', '0', '1.234', '15junk', '100000000']) {
    const response = await send('/expenses', {
      method: 'POST',
      body: { ...payload, amount },
      key: '14141414-1414-4414-8414-141414141414'
    });
    assert.equal(response.status, 400, `${amount} should be rejected`);
  }
  const maximum = await send('/expenses', {
    method: 'POST',
    body: { ...payload, amount: '99999999.99' },
    key: '15151515-1515-4515-8515-151515151515'
  });
  assert.equal(maximum.status, 201);
  const maximumBody = await maximum.json();
  assert.equal(maximumBody.amount, 99999999.99);
  assert.equal(maximumBody.note, '1234');

  const missingKey = await send('/expenses', { method: 'POST', body: payload });
  assert.equal(missingKey.status, 400);
});

test('expense updates and deletes work for the owner and reject foreign IDs', async () => {
  const create = await send('/expenses', {
    method: 'POST',
    body: { amount: '2.30', category: 'Food', date: getIndiaDateString() },
    key: '16161616-1616-4616-8616-161616161616'
  });
  const createdExpense = await create.json();

  const update = await send(`/expenses/${createdExpense.id}`, {
    method: 'PUT',
    body: { amount: '3.45', note: 'updated' }
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).amount, 3.45);

  const foreignUpdate = await send(`/expenses/${foreignExpense.id}`, {
    method: 'PUT',
    body: { amount: '9.99' }
  });
  assert.equal(foreignUpdate.status, 404);

  const deleteResponse = await send(`/expenses/${createdExpense.id}`, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 200);
  const foreignDelete = await send(`/expenses/${foreignExpense.id}`, { method: 'DELETE' });
  assert.equal(foreignDelete.status, 404);
  assert.equal(expenses.has(foreignExpense.id), true);
});

test('budget CRUD is owner-scoped and concurrent duplicate creates return conflict', async () => {
  const list = await send('/budgets');
  assert.deepEqual(await list.json(), []);

  const foreignUpdate = await send(`/budgets/${foreignBudget.id}`, {
    method: 'PUT',
    body: { monthlyBudget: '200.00' }
  });
  assert.equal(foreignUpdate.status, 404);
  assert.equal(foreignBudget.monthly_budget, '100.00');
  const foreignDelete = await send(`/budgets/${foreignBudget.id}`, { method: 'DELETE' });
  assert.equal(foreignDelete.status, 404);
  assert.equal(budgets.has(foreignBudget.id), true);

  const createBody = { category: 'Bills', monthlyBudget: '500.25' };
  const [first, duplicate] = await Promise.all([
    send('/budgets', { method: 'POST', body: createBody }),
    send('/budgets', { method: 'POST', body: createBody })
  ]);
  assert.deepEqual([first.status, duplicate.status].sort(), [201, 409]);

  for (const monthlyBudget of ['-1', '0', '1.234', '15junk', '100000000']) {
    const invalid = await send('/budgets', {
      method: 'POST',
      body: { category: 'Other', monthlyBudget }
    });
    assert.equal(invalid.status, 400, `${monthlyBudget} should be rejected`);
  }
  const maxBudget = await send('/budgets', {
    method: 'POST',
    body: { category: 'Other', monthlyBudget: '99999999.99' }
  });
  assert.equal(maxBudget.status, 201);

  const owned = [...budgets.values()].find((budget) =>
    budget.user_id === firstUser.id && budget.category === 'Bills'
  );
  const update = await send(`/budgets/${owned.id}`, {
    method: 'PUT',
    body: { monthlyBudget: '99999999.99' }
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).monthlyBudget, 99999999.99);

  const deleteResponse = await send(`/budgets/${owned.id}`, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 200);
});

test('invalid, future, zero and excessive-precision transaction fields are rejected', async () => {
  const key = '17171717-1717-4717-8717-171717171717';
  for (const date of ['2026-02-30', 'not-a-date', '']) {
    const response = await send('/expenses', {
      method: 'POST',
      body: { amount: '1.00', category: 'Food', date },
      key
    });
    assert.equal(response.status, 400);
  }
  const tomorrow = new Date(`${getIndiaDateString()}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const futureDate = tomorrow.toISOString().slice(0, 10);
  const future = await send('/expenses', {
    method: 'POST',
    body: { amount: '1.00', category: 'Food', date: futureDate },
    key
  });
  assert.equal(future.status, 400);

  const invalidNote = await send('/expenses', {
    method: 'POST',
    body: { amount: '1.00', category: 'Food', date: getIndiaDateString(), note: 123 },
    key: '18181818-1818-4818-8818-181818181818'
  });
  assert.equal(invalidNote.status, 400);
});
