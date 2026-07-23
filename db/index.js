'use strict';

const { Pool } = require('pg');
require('dotenv').config();

const config = require('../config');

const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: config.db.port,
});

// Test a one-time connection when this module is loaded.
pool.connect((err, client, done) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
    return;
  }

  console.log('✅ Connected to PostgreSQL database successfully');
  done();
});


const sequelizePkg = require('sequelize');
const Sequelize = sequelizePkg.Sequelize;
const DataTypes = sequelizePkg.DataTypes;

const sequelizeDatabase = process.env.DB_NAME || process.env.PGDATABASE || config.db.database;
const sequelizeUser = process.env.DB_USER || process.env.PGUSER || config.db.user;
const sequelizePassword = process.env.DB_PASSWORD || process.env.PGPASSWORD || config.db.password;
const sequelizeHost = process.env.DB_HOST || process.env.PGHOST || config.db.host;
const sequelizePort = parseInt(process.env.DB_PORT || process.env.PGPORT || config.db.port, 10) || 5432;

const sequelize = new Sequelize(sequelizeDatabase, sequelizeUser, sequelizePassword, {
  host: sequelizeHost,
  port: sequelizePort,
  dialect: 'postgres',
  define: { underscored: true },
  logging: config.env === 'development' ? (msg) => console.log(`[sql] ${msg}`) : false,
});

const User = require('../models/user')(sequelize, DataTypes);
const Product = require('../models/product')(sequelize, DataTypes);
const Cart = require('../models/cart')(sequelize, DataTypes);
const CartItem = require('../models/cartItem')(sequelize, DataTypes);
const Order = require('../models/order')(sequelize, DataTypes);
const OrderItem = require('../models/orderItem')(sequelize, DataTypes);

User.hasOne(Cart, { foreignKey: 'userId', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(CartItem, { foreignKey: 'productId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

const models = { User, Product, Cart, CartItem, Order, OrderItem };


/**
 * Validate database credentials/connectivity at startup.
 */
async function confirmPostgresConnection() {
  await pool.query('SELECT 1');
  return true;
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  sequelize,
  Sequelize,
  models,
  confirmPostgresConnection,
};
