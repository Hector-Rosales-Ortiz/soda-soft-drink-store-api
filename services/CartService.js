'use strict';

const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');
const { httpError } = require('./AuthService');

/**
 * Cart business logic. All operations are scoped to a single user.
 */

/** Return the user's cart with its line items and a computed total. */
async function getCart(userId) {
  const cart = await Cart.findOrCreateByUserId(userId);
  const items = await CartItem.findByCartId(cart.id);
  const total = items.reduce((sum, i) => sum + Number(i.line_total), 0);
  return { id: cart.id, items, total: Number(total.toFixed(2)) };
}

async function addItem(userId, { productId, quantity = 1 }) {
  const qty = parseInt(quantity, 10);
  if (!productId) throw httpError(400, 'productId is required');
  if (!Number.isInteger(qty) || qty < 1) {
    throw httpError(400, 'quantity must be a positive integer');
  }

  const product = await Product.findById(productId);
  if (!product) throw httpError(404, 'Product not found');
  if (product.stock < qty) throw httpError(409, 'Not enough stock available');

  const cart = await Cart.findOrCreateByUserId(userId);
  await CartItem.upsert(cart.id, productId, qty);
  return getCart(userId);
}

async function updateItem(userId, productId, quantity) {
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 0) {
    throw httpError(400, 'quantity must be a non-negative integer');
  }

  const cart = await Cart.findOrCreateByUserId(userId);

  if (qty === 0) {
    await CartItem.remove(cart.id, productId);
    return getCart(userId);
  }

  const updated = await CartItem.setQuantity(cart.id, productId, qty);
  if (!updated) throw httpError(404, 'Item not found in cart');
  return getCart(userId);
}

async function removeItem(userId, productId) {
  const cart = await Cart.findOrCreateByUserId(userId);
  const ok = await CartItem.remove(cart.id, productId);
  if (!ok) throw httpError(404, 'Item not found in cart');
  return getCart(userId);
}

async function clear(userId) {
  const cart = await Cart.findOrCreateByUserId(userId);
  await CartItem.clear(cart.id);
  return getCart(userId);
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clear,
};
