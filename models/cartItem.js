'use strict';

const { query } = require('../db');

/**
 * Individual cart entry model (a product + quantity inside a cart).
 */

/** Cart items joined with product details, for display. */
async function findByCartId(cartId) {
  const { rows } = await query(
    `SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity,
            p.name, p.price, p.image_url, p.flavor, p.size,
            (ci.quantity * p.price) AS line_total
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.id ASC`,
    [cartId]
  );
  return rows;
}

async function findOne(cartId, productId) {
  const { rows } = await query(
    `SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
    [cartId, productId]
  );
  return rows[0] || null;
}

/** Insert a new line, or bump the quantity if the product is already present. */
async function upsert(cartId, productId, quantity) {
  const { rows } = await query(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING *`,
    [cartId, productId, quantity]
  );
  return rows[0];
}

async function setQuantity(cartId, productId, quantity) {
  const { rows } = await query(
    `UPDATE cart_items SET quantity = $3
     WHERE cart_id = $1 AND product_id = $2
     RETURNING *`,
    [cartId, productId, quantity]
  );
  return rows[0] || null;
}

async function remove(cartId, productId) {
  const { rowCount } = await query(
    `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
    [cartId, productId]
  );
  return rowCount > 0;
}

async function clear(cartId, client = null) {
  const runner = client || require('../db');
  await runner.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
}

module.exports = {
  findByCartId,
  findOne,
  upsert,
  setQuantity,
  remove,
  clear,
};
