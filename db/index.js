'use strict';

const { Pool } = require('pg');
const config = require('../config');

/**
 * PostgreSQL connection pool.
 * A single shared pool is created for the whole app; models import the
 * `query` helper below instead of talking to `pg` directly.
 */
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
});

pool.on('error', (err) => {
  // Log unexpected errors on idle clients so a dropped connection
  // doesn't crash the whole process silently.
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Run a parameterised query against the pool.
 * @param {string} text  SQL with $1, $2, ... placeholders
 * @param {Array}  params Values for the placeholders
 * @returns {Promise<import('pg').QueryResult>}
 */
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
