'use strict';

const { pool } = require('../db');
const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const { httpError } = require('./AuthService');

/**
 * Order processing. Checkout runs inside a single DB transaction so an order
 * is never created with a partially decremented stock or a half-emptied cart.
 */

async function createOrderFromCart(userId) {
  const cart = await Cart.findOrCreateByUserId(userId);
  const items = await CartItem.findByCartId(cart.id);

  if (items.length === 0) {
    throw httpError(400, 'Cannot checkout an empty cart');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    for (const item of items) {
      // Reserve stock atomically; null means someone bought it first.
      const updated = await Product.decrementStock(item.product_id, item.quantity, client);
      if (!updated) {
        throw httpError(409, `Not enough stock for "${item.name}"`);
      }
      total += Number(item.price) * item.quantity;
    }

    const order = await Order.create(
      { userId, total: Number(total.toFixed(2)), status: 'pending' },
      client
    );

    for (const item of items) {
      await OrderItem.create(
        {
          orderId: order.id,
          productId: item.product_id,
          quantity: item.quantity,
          price: item.price,
        },
        client
      );
    }

    await CartItem.clear(cart.id, client);
    await client.query('COMMIT');

    return getOrder(userId, order.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listOrders(userId) {
  return Order.findByUserId(userId);
}

async function getOrder(userId, orderId) {
  const order = await Order.findByIdForUser(orderId, userId);
  if (!order) throw httpError(404, 'Order not found');
  const items = await OrderItem.findByOrderId(order.id);
  return { ...order, items };
}

module.exports = {
  createOrderFromCart,
  listOrders,
  getOrder,
};
