const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const {
  createDatabasePoolConfig
} = require('../databasePoolConfig');
const { normalizeEmail } = require('../email');
const { parsePositiveAmount } = require('../expenseValidation');
const {
  signSessionToken,
  verifySessionToken
} = require('../authTokens');
const {
  getSessionCookieName,
  getSessionCookieOptions,
  readCookie
} = require('../sessionCookie');

const TEST_SECRET = 'test-secret-that-is-long-enough-for-a-unit-test';

test('production database config enforces hostname and certificate verification', () => {
  const config = createDatabasePoolConfig(
    'postgresql://user:password@db.example.test/app?sslmode=require',
    'production'
  );
  const url = new URL(config.connectionString);
  const client = new Client(config);

  assert.equal(url.searchParams.get('sslmode'), 'verify-full');
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.notEqual(client.connectionParameters.ssl, false);
});

test('local database config retains the existing non-TLS behavior', () => {
  const config = createDatabasePoolConfig(
    'postgresql://localhost:5432/app',
    'development'
  );

  assert.equal(config.ssl, false);
  assert.equal(config.connectionString, 'postgresql://localhost:5432/app');
});

test('email normalization trims and lowercases addresses', () => {
  assert.equal(normalizeEmail('  Person@Example.COM '), 'person@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail('a'.repeat(250) + '@example.com'), null);
});

test('expense amount parsing accepts valid decimals and rejects malformed values', () => {
  assert.equal(parsePositiveAmount('12.30'), 12.3);
  assert.equal(parsePositiveAmount(12), 12);
  for (const invalid of ['0', '-1', '1.234', '12junk', '1e3', Infinity, null]) {
    assert.equal(parsePositiveAmount(invalid), null);
  }
});

test('session tokens require the configured algorithm, audience, issuer, and expiry', () => {
  const user = { id: 'user-id', email: 'person@example.com', name: 'Person' };
  const token = signSessionToken(user, 'session-id', TEST_SECRET);
  const payload = verifySessionToken(token, TEST_SECRET);

  assert.equal(payload.sub, user.id);
  assert.equal(payload.jti, 'session-id');
  assert.throws(() => verifySessionToken(token, 'different-secret'));

  const expiredToken = jwt.sign(
    {},
    TEST_SECRET,
    {
      algorithm: 'HS256',
      audience: 'personal-finance-tracker-client',
      expiresIn: -1,
      issuer: 'personal-finance-tracker',
      jwtid: 'expired-session',
      subject: user.id
    }
  );
  assert.throws(() => verifySessionToken(expiredToken, TEST_SECRET));

  const wrongAlgorithmToken = jwt.sign({}, TEST_SECRET, { algorithm: 'HS384' });
  assert.throws(() => verifySessionToken(wrongAlgorithmToken, TEST_SECRET));
});

test('session cookies are HttpOnly and secure in production', () => {
  assert.equal(getSessionCookieName(true), '__Host-pft_session');
  assert.equal(getSessionCookieOptions(true).httpOnly, true);
  assert.equal(getSessionCookieOptions(true).secure, true);
  assert.equal(getSessionCookieOptions(false).secure, false);
});

test('cookie reader extracts the session cookie without exposing other values', () => {
  assert.equal(
    readCookie({ headers: { cookie: 'theme=dark; pft_session=abc.def' } }, 'pft_session'),
    'abc.def'
  );
  assert.equal(readCookie({ headers: { cookie: 'theme=dark' } }, 'pft_session'), null);
});
