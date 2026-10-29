const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

const googleProfiles = new Map();
OAuth2Client.prototype.verifyIdToken = async ({ idToken, audience }) => {
  const payload = googleProfiles.get(idToken);
  if (!payload || audience !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Invalid test Google credential');
  }
  return { getPayload: () => payload };
};

const database = require('../db');
const user = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Test User',
  email: 'person@example.com',
  password: bcrypt.hashSync('correct-password', 4)
};
const sessions = new Map();
const usersByGoogleSub = new Map();
const usersByEmail = new Map([[user.email, user]]);
const googleUsersCreated = [];
let expenseSelectCount = 0;
let expenseInsertCount = 0;
let lastExpenseDeleteQuery;

database.query = async (text, values = []) => {
  if (text.includes('INSERT INTO auth_sessions')) {
    sessions.set(values[0], { id: values[0], user_id: values[1], expires_at: values[2] });
    return [];
  }
  if (text.includes('INSERT INTO users')) {
    usersByEmail.set(values[2], {
      id: values[0],
      name: values[1],
      email: values[2],
      password: values[3],
      google_sub: null
    });
    return [];
  }
  if (text.includes('DELETE FROM auth_sessions')) {
    sessions.delete(values[0]);
    return [];
  }
  if (text.startsWith('DELETE FROM expenses')) {
    lastExpenseDeleteQuery = { text, values };
    return [];
  }
  if (text.includes('INSERT INTO expenses')) {
    expenseInsertCount += 1;
    return [];
  }
  return [];
};

database.queryOne = async (text, values = []) => {
  if (text.includes('FROM auth_sessions')) {
    const session = sessions.get(values[0]);
    return session && session.user_id === values[1] && Date.parse(session.expires_at) > Date.now()
      ? session
      : undefined;
  }
  if (text.includes('INSERT INTO users') && text.includes('google_sub')) {
    const createdUser = {
      id: values[0],
      name: values[1],
      email: values[2],
      password: null,
      google_sub: values[3]
    };
    usersByGoogleSub.set(createdUser.google_sub, createdUser);
    usersByEmail.set(createdUser.email, createdUser);
    googleUsersCreated.push(createdUser);
    return createdUser;
  }
  if (text.includes('FROM users') && text.includes('google_sub = $1')) {
    return usersByGoogleSub.get(values[0]);
  }
  if (text.includes('FROM users') && text.includes('LOWER(BTRIM(email))')) {
    return usersByEmail.get(values[0]);
  }
  if (text.includes('FROM users') && text.includes('WHERE id = $1')) {
    return [...usersByEmail.values()].find((candidate) => candidate.id === values[0]);
  }
  if (text.includes('FROM expenses')) {
    expenseSelectCount += 1;
    return {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      user_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    };
  }
  return undefined;
};

const { app } = require('../server');
let server;
let baseUrl;

const addGoogleProfile = (credential, { sub, email, name = 'Google User' }) => {
  googleProfiles.set(credential, {
    aud: process.env.GOOGLE_CLIENT_ID,
    email_verified: true,
    sub,
    email,
    name
  });
};

const googleRequest = (path, credential) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ credential })
});

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

test('email/password login issues an HttpOnly session cookie and logout revokes it', async () => {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ' PERSON@EXAMPLE.COM ', password: 'correct-password' })
  });

  assert.equal(loginResponse.status, 200);
  const responseBody = await loginResponse.json();
  assert.equal(responseBody.token, undefined);

  const cookie = loginResponse.headers.getSetCookie()[0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  const cookiePair = cookie.split(';', 1)[0];

  const currentUserResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: cookiePair }
  });
  assert.equal(currentUserResponse.status, 200);

  const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookiePair }
  });
  assert.equal(logoutResponse.status, 204);

  const revokedResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: cookiePair }
  });
  assert.equal(revokedResponse.status, 401);
});

test('manual signup creates a password account and establishes a session', async () => {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'New User',
      email: 'new-user@example.com',
      password: 'a-secure-password',
      confirmPassword: 'a-secure-password'
    })
  });

  assert.equal(response.status, 201);
  const responseBody = await response.json();
  assert.equal(responseBody.user.email, 'new-user@example.com');
  assert.equal(responseBody.token, undefined);
  assert.notEqual(usersByEmail.get('new-user@example.com').password, 'a-secure-password');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
});

test('Google sign-in rejects an unregistered account without creating it', async () => {
  addGoogleProfile('new-google-user', {
    sub: 'google-sub-new',
    email: 'new-google@example.com'
  });

  const beforeCount = googleUsersCreated.length;
  const response = await googleRequest('/auth/google', 'new-google-user');
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'No account found. Please sign up first.'
  });
  assert.equal(googleUsersCreated.length, beforeCount);
  assert.equal(response.headers.getSetCookie().length, 0);
});

test('Google signup creates an account and establishes a secure session', async () => {
  addGoogleProfile('google-signup-user', {
    sub: 'google-sub-signup',
    email: 'google-signup@example.com',
    name: 'Signup User'
  });

  const response = await googleRequest('/auth/google/signup', 'google-signup-user');
  assert.equal(response.status, 200);
  const responseBody = await response.json();
  assert.equal(responseBody.user.email, 'google-signup@example.com');
  assert.equal(
    [...usersByGoogleSub.values()].filter((candidate) => candidate.google_sub === 'google-sub-signup').length,
    1
  );

  const cookie = response.headers.getSetCookie()[0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);

  const signInResponse = await googleRequest('/auth/google', 'google-signup-user');
  assert.equal(signInResponse.status, 200);
  assert.equal((await signInResponse.json()).user.email, 'google-signup@example.com');
});

test('Google signup does not duplicate an existing Google account', async () => {
  addGoogleProfile('existing-google-user', {
    sub: 'google-sub-existing',
    email: 'google-existing@example.com'
  });
  const signupResponse = await googleRequest('/auth/google/signup', 'existing-google-user');
  assert.equal(signupResponse.status, 200);
  const userId = (await signupResponse.json()).user.id;
  const beforeCount = googleUsersCreated.length;

  const signInResponse = await googleRequest('/auth/google', 'existing-google-user');
  assert.equal(signInResponse.status, 200);
  assert.equal((await signInResponse.json()).user.id, userId);
  assert.equal(googleUsersCreated.length, beforeCount);
});

test('Google auth does not link an existing email/password account', async () => {
  addGoogleProfile('password-account-google', {
    sub: 'google-sub-password-account',
    email: user.email
  });
  const beforeCount = googleUsersCreated.length;

  const signInResponse = await googleRequest('/auth/google', 'password-account-google');
  assert.equal(signInResponse.status, 401);
  assert.deepEqual(await signInResponse.json(), {
    error: 'No account found. Please sign up first.'
  });

  const signupResponse = await googleRequest('/auth/google/signup', 'password-account-google');
  assert.equal(signupResponse.status, 409);
  assert.match((await signupResponse.json()).error, /Google sign-in was not linked/);
  assert.equal(googleUsersCreated.length, beforeCount);
  assert.equal(usersByGoogleSub.has('google-sub-password-account'), false);
});

test('invalid session tokens are rejected', async () => {
  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: 'pft_session=not-a-valid-token' }
  });
  assert.equal(response.status, 401);
  assert.match(response.headers.get('set-cookie'), /pft_session=;/);
});

test('the current-user route returns unauthorized when no session cookie is present', async () => {
  const response = await fetch(`${baseUrl}/auth/me`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Access token required' });
});

test('protected finance routes reject requests without a session cookie', async () => {
  const response = await fetch(`${baseUrl}/expenses`);
  assert.equal(response.status, 401);
});

test('a user cannot delete another user’s expense by changing its ID', async () => {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'correct-password' })
  });
  const cookiePair = loginResponse.headers.getSetCookie()[0].split(';', 1)[0];
  const response = await fetch(`${baseUrl}/expenses/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`, {
    method: 'DELETE',
    headers: { Cookie: cookiePair }
  });

  assert.equal(response.status, 404);
  assert.match(lastExpenseDeleteQuery.text, /WHERE id = \$1 AND user_id = \$2/);
  assert.equal(lastExpenseDeleteQuery.values[1], user.id);
});

test('malformed expense amounts and oversized daily analytics ranges are rejected before data queries', async () => {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'correct-password' })
  });
  const cookiePair = loginResponse.headers.getSetCookie()[0].split(';', 1)[0];

  const beforeInsertCount = expenseInsertCount;
  const invalidExpenseResponse = await fetch(`${baseUrl}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookiePair },
    body: JSON.stringify({
      amount: '15garbage',
      category: 'Food',
      date: '2026-10-20'
    })
  });
  assert.equal(invalidExpenseResponse.status, 400);
  assert.equal(expenseInsertCount, beforeInsertCount);

  const beforeExpenseSelectCount = expenseSelectCount;
  const analyticsResponse = await fetch(
    `${baseUrl}/analytics/daily-spending?startDate=2023-03-01&endDate=2024-03-02`,
    { headers: { Cookie: cookiePair } }
  );
  assert.equal(analyticsResponse.status, 400);
  assert.equal(expenseSelectCount, beforeExpenseSelectCount);
});

test('unlisted browser origins are rejected', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://untrusted.example' }
  });
  assert.equal(response.status, 403);
});

test('login rate limiting returns HTTP 429 when attempts exceed the limit', async () => {
  const responses = await Promise.all(Array.from({ length: 25 }, () => fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'wrong-password' })
  })));

  assert.ok(responses.some((response) => response.status === 429));
});
