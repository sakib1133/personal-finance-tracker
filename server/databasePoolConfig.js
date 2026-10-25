function createDatabasePoolConfig(databaseUrl, nodeEnv) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const isProduction = nodeEnv === 'production';
  let connectionString = databaseUrl;

  if (isProduction) {
    const parsedUrl = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
      throw new Error('DATABASE_URL must use the PostgreSQL protocol');
    }

    parsedUrl.searchParams.set('sslmode', 'verify-full');
    connectionString = parsedUrl.toString();
  }

  return {
    connectionString,
    ssl: isProduction ? { rejectUnauthorized: true } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
}

module.exports = { createDatabasePoolConfig };
