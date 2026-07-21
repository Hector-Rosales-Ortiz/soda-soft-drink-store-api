'use strict';

const { query } = require('../db');

/**
 * Order record model.
 */

async function create({ userId, total, status = 'pending' }, client = null) {
  const runner = client || require('../db');
  const { rows } = await runner.query(
    `INSERT INTO orders (user_id, total, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, total, status]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function findByIdForUser(id, userId) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  const { rows } = await query(
    `UPDATE orders SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0] || null;
}

module.exports = {
  create,
  findByUserId,
  findByIdForUser,
  updateStatus,
};
