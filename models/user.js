'use strict';

const { query } = require('../db');

/**
 * User / account data model.
 * `password_hash` is never returned by the public-facing selectors so it
 * can't leak out of a route response.
 */

const PUBLIC_COLUMNS = 'id, email, name, created_at';

async function create({ email, name, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email, name, passwordHash]
  );
  return rows[0];
}

/** Includes the password hash — use only for authentication. */
async function findByEmailWithHash(email) {
  const { rows } = await query(
    `SELECT id, email, name, password_hash, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateById(id, { name, email }) {
  const { rows } = await query(
    `UPDATE users
     SET name = COALESCE($2, name),
         email = COALESCE($3, email)
     WHERE id = $1
     RETURNING ${PUBLIC_COLUMNS}`,
    [id, name ?? null, email ?? null]
  );
  return rows[0] || null;
}

module.exports = {
  create,
  findByEmailWithHash,
  findById,
  updateById,
};
