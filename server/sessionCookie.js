const SESSION_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

function getSessionCookieName(isProduction) {
  return isProduction ? '__Host-pft_session' : 'pft_session';
}

function getSessionCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE
  };
}

function readCookie(request, cookieName) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0 || entry.slice(0, separator).trim() !== cookieName) {
      continue;
    }

    try {
      return decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

module.exports = {
  getSessionCookieName,
  getSessionCookieOptions,
  readCookie
};
