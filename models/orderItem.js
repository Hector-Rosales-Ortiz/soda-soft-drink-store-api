'use strict';

const { query } = require('../db');

/**
 * Items inside an order. Price is captured at purchase time so historical
 * orders stay accurate even if the product price later changes.
 */

async function create({ orderId, productId, quantity, price }, client = null) {
  const runner = client || require('../db');
  const { rows } = await runner.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [orderId, productId, quantity, price]
  );
  return rows[0];
}

async function findByOrderId(orderId) {
  const { rows } = await query(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price,
            p.name, p.image_url, p.flavor, p.size,
            (oi.quantity * oi.price) AS line_total
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );
  return rows;
}

module.exports = {
  create,
  findByOrderId,
};
