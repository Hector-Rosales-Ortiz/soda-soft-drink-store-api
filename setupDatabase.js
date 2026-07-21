'use strict';

const { Pool } = require('pg');
require('dotenv').config();

const targetDatabase = process.env.DB_NAME || process.env.PGDATABASE || 'soda_store';
const dbConfig = {
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10) || 5432,
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

  try {
    console.log('🔄 Creating database tables...');

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Products table (soda drinks)
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        image_url TEXT,
        stock_quantity INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Carts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cart Items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        cart_id INT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 1,
        UNIQUE(cart_id, product_id)
      );
    `);

    // Orders table
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Order Items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        price_at_purchase DECIMAL(10,2) NOT NULL
      );
    `);

    console.log('✅ All tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    process.exit(1);
  }
};

async function main() {
  try {
    await ensureDatabase();
    await createTables();
  } catch (err) {
    console.error('❌ Error creating database or tables:', err);
    process.exit(1);
  }
}

main();
