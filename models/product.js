'use strict';

const { query } = require('../db');

/**
 * Soda drink product model.
 */

async function findAll({ search, flavor, limit = 50, offset = 0 } = {}) {
  const clauses = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }
  if (flavor) {
    params.push(flavor);
    clauses.push(`flavor = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await query(
    `SELECT * FROM products
     ${where}
     ORDER BY name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM products WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ name, description, price, stock, flavor, size, imageUrl }) {
  const { rows } = await query(
    `INSERT INTO products (name, description, price, stock, flavor, size, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, description ?? null, price, stock ?? 0, flavor ?? null, size ?? null, imageUrl ?? null]
  );
  return rows[0];
}

async function updateById(id, fields) {
  const { rows } = await query(
    `UPDATE products SET
       name        = COALESCE($2, name),
       description = COALESCE($3, description),
       price       = COALESCE($4, price),
       stock       = COALESCE($5, stock),
       flavor      = COALESCE($6, flavor),
       size        = COALESCE($7, size),
       image_url   = COALESCE($8, image_url)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      fields.name ?? null,
      fields.description ?? null,
      fields.price ?? null,
      fields.stock ?? null,
      fields.flavor ?? null,
      fields.size ?? null,
      fields.imageUrl ?? null,
    ]
  );
  return rows[0] || null;
}

async function deleteById(id) {
  const { rowCount } = await query(`DELETE FROM products WHERE id = $1`, [id]);
  return rowCount > 0;
}

/** Atomically decrement stock, refusing to go negative. Returns updated row or null. */
async function decrementStock(id, quantity, client = null) {
  const runner = client || require('../db');
  const { rows } = await runner.query(
    `UPDATE products
     SET stock = stock - $2
     WHERE id = $1 AND stock >= $2
     RETURNING *`,
    [id, quantity]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
  decrementStock,
};
