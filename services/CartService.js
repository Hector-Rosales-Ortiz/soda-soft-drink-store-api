'use strict';

const { sequelize, models } = require('../db');
const { httpError } = require('./AuthService');

const { Cart, CartItem, Product } = models;

/**
 * Cart business logic (backed by Sequelize). All operations are scoped to a
 * single user.
 */

/** Return the user's cart row, creating one on first access. */
async function getOrCreateCart(userId) {
  const [cart] = await Cart.findOrCreate({ where: { userId } });
  return cart;
}

/** Shape a CartItem (with its included Product) into the API representation. */
function cartItemDTO(item) {
  const product = item.Product;
  const price = Number(product.price);
  return {
    id: item.id,
    product_id: item.productId,
    name: product.name,
    price,
    image_url: product.imageUrl,
    flavor: product.flavor,
    size: product.size,
    quantity: item.quantity,
    line_total: Number((price * item.quantity).toFixed(2)),
  };
}

/** Return the user's cart with its line items and a computed total. */
async function getCart(userId) {
  const cart = await getOrCreateCart(userId);
  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    include: [{ model: Product }],
    order: [['id', 'ASC']],
  });
  const dtos = items.map(cartItemDTO);
  const total = dtos.reduce((sum, i) => sum + i.line_total, 0);
  return { id: cart.id, items: dtos, total: Number(total.toFixed(2)) };
}

async function addItem(userId, { productId, quantity = 1 }) {
  const qty = parseInt(quantity, 10);
  if (!productId) throw httpError(400, 'productId is required');
  if (!Number.isInteger(qty) || qty < 1) {
    throw httpError(400, 'quantity must be a positive integer');
  }

  // Resolve (or lazily create) the cart outside the transaction so the
  // INSERT on `carts` doesn't hold a lock longer than necessary.
  const cart = await getOrCreateCart(userId);

  // Wrap the stock-check + cart-item upsert in a transaction with a
  // row-level lock on the product.  This prevents two concurrent addItem
  // calls from both passing the stock check and together overselling stock.
  return sequelize.transaction(async (t) => {
    const product = await Product.findByPk(productId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!product) throw httpError(404, 'Product not found');

    const [item, created] = await CartItem.findOrCreate({
      where: { cartId: cart.id, productId },
      defaults: { quantity: qty },
      transaction: t,
    });

    const newQty = created ? qty : item.quantity + qty;
    if (product.stock < newQty) throw httpError(409, 'Not enough stock available');

    if (!created) {
      item.quantity = newQty;
      await item.save({ transaction: t });
    }

    return getCart(userId);
  });
}

async function updateItem(userId, productId, quantity) {
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 0) {
    throw httpError(400, 'quantity must be a non-negative integer');
  }

  const cart = await getOrCreateCart(userId);
  const item = await CartItem.findOne({ where: { cartId: cart.id, productId } });
  if (!item) throw httpError(404, 'Item not found in cart');

  if (qty === 0) {
    await item.destroy();
    return getCart(userId);
  }

  const product = await Product.findByPk(productId);
  if (product && product.stock < qty) {
    throw httpError(409, 'Not enough stock available');
  }

  item.quantity = qty;
  await item.save();
  return getCart(userId);
}

async function removeItem(userId, productId) {
  const cart = await getOrCreateCart(userId);
  const destroyed = await CartItem.destroy({ where: { cartId: cart.id, productId } });
  if (!destroyed) throw httpError(404, 'Item not found in cart');
  return getCart(userId);
}

async function clear(userId) {
  const cart = await getOrCreateCart(userId);
  await CartItem.destroy({ where: { cartId: cart.id } });
  return getCart(userId);
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clear,
};
