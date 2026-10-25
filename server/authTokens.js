const jwt = require('jsonwebtoken');

const JWT_ISSUER = 'personal-finance-tracker';
const JWT_AUDIENCE = 'personal-finance-tracker-client';
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

function signSessionToken(user, sessionId, secret) {
  return jwt.sign(
    { email: user.email, fullName: user.name },
    secret,
    {
      algorithm: 'HS256',
      audience: JWT_AUDIENCE,
      expiresIn: '24h',
      issuer: JWT_ISSUER,
      jwtid: sessionId,
      subject: user.id
    }
  );
}

function verifySessionToken(token, secret) {
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER
  });

  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    throw new Error('Invalid session token claims');
  }

  return payload;
}

module.exports = {
  JWT_AUDIENCE,
  JWT_ISSUER,
  SESSION_LIFETIME_MS,
  signSessionToken,
  verifySessionToken
};
