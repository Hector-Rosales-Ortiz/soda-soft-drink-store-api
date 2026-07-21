'use strict';

const { sequelize, models } = require('../db');
const { httpError } = require('./AuthService');

const { Cart, CartItem, Product, Order, OrderItem } = models;

/**
 * Order processing (backed by Sequelize). Checkout runs inside a single
 * transaction with row-level locks on each product, so an order is never
 * created with a partially decremented stock or a half-emptied cart.
 */

function orderItemDTO(item) {
  const product = item.Product;
  const price = Number(item.price);
  return {
    id: item.id,
    product_id: item.productId,
    name: product ? product.name : undefined,
    image_url: product ? product.imageUrl : undefined,
    flavor: product ? product.flavor : undefined,
    size: product ? product.size : undefined,
    quantity: item.quantity,
    price,
    line_total: Number((price * item.quantity).toFixed(2)),
  };
}

function orderDTO(order, items) {
  return {
    id: order.id,
    user_id: order.userId,
    total: Number(order.total),
    status: order.status,
    created_at: order.createdAt,
    items: items ? items.map(orderItemDTO) : undefined,
  };
}

async function createOrderFromCart(userId) {
  const [cart] = await Cart.findOrCreate({ where: { userId } });
  const cartItems = await CartItem.findAll({
    where: { cartId: cart.id },
    include: [{ model: Product }],
  });

  if (cartItems.length === 0) {
    throw httpError(400, 'Cannot checkout an empty cart');
  }

  const order = await sequelize.transaction(async (t) => {
    let total = 0;

    for (const item of cartItems) {
      // Lock the product row for the duration of the transaction, then
      // verify and decrement stock so two checkouts can't oversell.
      const product = await Product.findByPk(item.productId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!product || product.stock < item.quantity) {
        throw httpError(409, `Not enough stock for "${item.Product.name}"`);
      }
      product.stock -= item.quantity;
      await product.save({ transaction: t });

      total += Number(product.price) * item.quantity;
    }

    const createdOrder = await Order.create(
      { userId, total: Number(total.toFixed(2)), status: 'pending' },
      { transaction: t }
    );

    await OrderItem.bulkCreate(
      cartItems.map((item) => ({
        orderId: createdOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.Product.price,
      })),
      { transaction: t }
    );

    await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

    return createdOrder;
  });

  return getOrder(userId, order.id);
}

async function listOrders(userId) {
  const orders = await Order.findAll({
    where: { userId },
    order: [['created_at', 'DESC']],
  });
  return orders.map((o) => orderDTO(o));
}

async function getOrder(userId, orderId) {
  const order = await Order.findOne({ where: { id: orderId, userId } });
  if (!order) throw httpError(404, 'Order not found');

  const items = await OrderItem.findAll({
    where: { orderId: order.id },
    include: [{ model: Product }],
    order: [['id', 'ASC']],
  });
  return orderDTO(order, items);
}

module.exports = {
  createOrderFromCart,
  listOrders,
  getOrder,
};
