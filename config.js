'use strict';

require('dotenv').config();

/**
 * Parse individual DB connection fields from a DATABASE_URL connection string.
 * Returns an object with host, port, database, user, and password fields,
 * falling back to empty strings when a field is absent in the URL.
 * @param {string} databaseUrl - A postgres:// or postgresql:// connection URL.
 */
function parseDbUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname || '',
      port: parseInt(parsed.port, 10) || 5432,
      database: (parsed.pathname || '').replace(/^\//, ''),
      user: parsed.username || '',
      password: parsed.password || '',
    };
  } catch {
    return null;
  }
}

/**
 * Shared application settings.
 * Reads from the environment (see example.env) and exposes a single
 * config object so no other file has to touch `process.env` directly.
 *
 * The database can be configured either via DATABASE_URL (a full connection
 * string) or via individual DB_* / PG* variables. DATABASE_URL takes
 * precedence when both are present.
 */
const dbFromUrl = process.env.DATABASE_URL ? parseDbUrl(process.env.DATABASE_URL) : null;

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4001,

  db: {
    host: (dbFromUrl && dbFromUrl.host) || process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port:
      (dbFromUrl && dbFromUrl.port) ||
      parseInt(process.env.DB_PORT || process.env.PGPORT, 10) ||
      5432,
    database:
      (dbFromUrl && dbFromUrl.database) ||
      process.env.DB_NAME ||
      process.env.PGDATABASE ||
      'soda_store',
    user: (dbFromUrl && dbFromUrl.user) || process.env.DB_USER || process.env.PGUSER || 'postgres',
    password:
      (dbFromUrl && dbFromUrl.password) ||
      process.env.DB_PASSWORD ||
      process.env.PGPASSWORD ||
      'postgres',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change_me_to_a_long_random_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  cors: {
    // Support a comma-separated list of origins.
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
};

module.exports = config;
