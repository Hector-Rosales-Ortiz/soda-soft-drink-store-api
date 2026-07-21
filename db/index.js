'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');

/**
 * PostgreSQL connection via the Sequelize ORM.
 *
 * This module owns the single Sequelize instance, loads every model, wires
 * up their associations, and exports the ready-to-use `models` registry.
 * Services import `models` from here instead of writing raw SQL.
 */
const sequelize = new Sequelize(
  config.db.database,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    // snake_case columns (user_id, created_at, ...) from camelCase attributes.
    define: { underscored: true },
    logging: config.env === 'development' ? (msg) => console.log(`[sql] ${msg}`) : false,
  }
);

// ── Load models ───────────────────────────────────────────
const User = require('../models/user')(sequelize, DataTypes);
const Product = require('../models/product')(sequelize, DataTypes);
const Cart = require('../models/cart')(sequelize, DataTypes);
const CartItem = require('../models/cartItem')(sequelize, DataTypes);
const Order = require('../models/order')(sequelize, DataTypes);
const OrderItem = require('../models/orderItem')(sequelize, DataTypes);

// ── Associations ──────────────────────────────────────────
// A user has one cart and many orders.
User.hasOne(Cart, { foreignKey: 'userId', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId' });

// A cart has many line items, each pointing at a product.
Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(CartItem, { foreignKey: 'productId' });

// An order has many line items, each capturing the product + price at purchase.
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

const models = { User, Product, Cart, CartItem, Order, OrderItem };

module.exports = { sequelize, Sequelize, models };
