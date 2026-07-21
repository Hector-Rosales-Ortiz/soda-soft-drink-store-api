'use strict';

require('dotenv').config();

/**
 * Shared application settings.
 * Reads from the environment (see example.env) and exposes a single
 * config object so no other file has to touch `process.env` directly.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4001,

  db: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT, 10) || 5432,
    database: process.env.PGDATABASE || 'soda_store',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
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
