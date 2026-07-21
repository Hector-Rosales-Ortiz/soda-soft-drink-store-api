'use strict';

const { Pool } = require('pg');
require('dotenv').config();
const config = require('./config');

const targetDatabase = config.db.database;
const dbConfig = {
  user: config.db.user,
  host: config.db.host,
  password: config.db.password,
  port: config.db.port,
};

async function ensureDatabase() {
  const adminPool = new Pool({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    const existsResult = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDatabase]);

    if (existsResult.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${targetDatabase.replace(/"/g, '""')}"`);
      console.log(`✅ Created database ${targetDatabase}`);
    } else {
      console.log(`ℹ️  Database ${targetDatabase} already exists`);
    }
  } finally {
    await adminPool.end();
  }
}

const createTables = async () => {
  const db = require('./db/index.js');

  console.log('🔄 Creating database tables...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      flavor VARCHAR(100),
      size VARCHAR(50),
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      cart_id INT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cart_id, product_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ All tables created successfully!');
};

async function main() {
  let db;
  let exitCode = 0;

  try {
    await ensureDatabase();
    db = require('./db/index.js');
    await createTables();
  } catch (err) {
    console.error('❌ Error creating database or tables:', err);
    exitCode = 1;
  } finally {
    if (db && db.pool) {
      await db.pool.end().catch((err) => console.error('Pool cleanup error:', err));
    }
  }

  process.exit(exitCode);
}

main();
