'use strict';

const { query } = require('../db');

/**
 * Cart data model. Each user has exactly one active cart.
 */

async function findByUserId(userId) {
  const { rows } = await query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function create(userId) {
  const { rows } = await query(
    `INSERT INTO carts (user_id) VALUES ($1) RETURNING *`,
    [userId]
  );
  return rows[0];
}

/** Return the user's cart, creating one on first access. */
async function findOrCreateByUserId(userId) {
  return (await findByUserId(userId)) || (await create(userId));
}

module.exports = {
  findByUserId,
  create,
  findOrCreateByUserId,
};
