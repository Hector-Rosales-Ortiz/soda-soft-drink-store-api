'use strict';

/**
 * seed.js — Populates the database with fixed product fixtures and a demo user.
 *
 * Usage:
 *   node seed.js            # Insert fixtures; skip rows that already exist.
 *   node seed.js --reset    # Truncate products table first, then re-insert.
 *
 * The products table has no application-level unique key other than the
 * auto-generated id, so by default this script is a no-op when products are
 * already present (safe to run multiple times).  Pass --reset to clear and
 * reload all fixtures from scratch (cart_items and order_items that reference
 * the old product rows will be removed via CASCADE).
 *
 * The demo user is always inserted with ON CONFLICT (email) DO NOTHING, so
 * running the script multiple times never creates duplicate accounts.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const config = require('./config');

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const PRODUCTS = [
  {
    name: 'Classic Cola',
    description: 'The original cola taste — crisp, caramel sweetness with a fizzy finish.',
    price: 1.99,
    stock: 120,
    flavor: 'Cola',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Diet Cola',
    description: 'All the classic cola flavor with zero calories.',
    price: 1.99,
    stock: 90,
    flavor: 'Cola',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Cherry Burst',
    description: 'Bold cherry flavor with a satisfying carbonated kick.',
    price: 2.09,
    stock: 75,
    flavor: 'Cherry',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Orange Fizz',
    description: 'Bright citrus orange soda made with real orange essence.',
    price: 1.89,
    stock: 85,
    flavor: 'Orange',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Grape Thunder',
    description: 'Rich grape soda with a deep purple color and sweet finish.',
    price: 1.89,
    stock: 60,
    flavor: 'Grape',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Lemon Lime Spark',
    description: 'Refreshingly tart lemon-lime blend — the classic thirst quencher.',
    price: 1.79,
    stock: 100,
    flavor: 'Lemon-Lime',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Root Beer Classic',
    description: 'Smooth and creamy root beer brewed with natural vanilla.',
    price: 2.19,
    stock: 70,
    flavor: 'Root Beer',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Strawberry Dream',
    description: 'Light and fruity strawberry soda — perfect for a sunny day.',
    price: 2.09,
    stock: 55,
    flavor: 'Strawberry',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Watermelon Wave',
    description: 'Sweet summer watermelon soda with a refreshing cool finish.',
    price: 2.29,
    stock: 45,
    flavor: 'Watermelon',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Pineapple Blast',
    description: 'Tropical pineapple soda bursting with sweet tangy notes.',
    price: 2.29,
    stock: 50,
    flavor: 'Pineapple',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Ginger Spice',
    description: 'Fiery ginger beer with a spicy warmth — great on its own or in cocktails.',
    price: 2.49,
    stock: 40,
    flavor: 'Ginger',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Cream Soda Supreme',
    description: 'Velvety smooth cream soda with rich vanilla undertones.',
    price: 2.19,
    stock: 65,
    flavor: 'Cream',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Cola Zero Sugar',
    description: 'Zero sugar cola with the same bold taste you love.',
    price: 1.99,
    stock: 80,
    flavor: 'Cola',
    size: '20 fl oz',
    image_url: null,
  },
  {
    name: 'Blue Raspberry Rush',
    description: 'Neon-blue raspberry soda with a tangy candy-like flavor.',
    price: 2.39,
    stock: 35,
    flavor: 'Raspberry',
    size: '12 fl oz',
    image_url: null,
  },
  {
    name: 'Mango Tango',
    description: 'Exotic mango soda with a tropical sweetness and fizzy lift.',
    price: 2.39,
    stock: 42,
    flavor: 'Mango',
    size: '12 fl oz',
    image_url: null,
  },
];

const DEMO_USER = {
  email: 'demo@sodastore.example',
  name: 'Demo User',
  password: 'DemoPass123!',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDbConfig() {
  return {
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
  };
}

async function seedProducts(pool, reset) {
  if (reset) {
    await pool.query('TRUNCATE products RESTART IDENTITY CASCADE');
    console.log('🗑️  Truncated products table (--reset)');
  } else {
    const { rowCount } = await pool.query('SELECT 1 FROM products LIMIT 1');
    if (rowCount > 0) {
      console.log(
        'ℹ️  Products table already contains rows — skipping product seed (use --reset to reload)'
      );
      return;
    }
  }

  const placeholders = PRODUCTS.map(
    (_, i) =>
      `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
  ).join(', ');

  const values = PRODUCTS.flatMap((p) => [
    p.name,
    p.description,
    p.price,
    p.stock,
    p.flavor,
    p.size,
    p.image_url,
  ]);

  await pool.query(
    `INSERT INTO products (name, description, price, stock, flavor, size, image_url)
     VALUES ${placeholders}`,
    values
  );

  console.log(`✅ Seeded ${PRODUCTS.length} products`);
}

async function seedDemoUser(pool) {
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [DEMO_USER.email, DEMO_USER.name, passwordHash]
  );

  if (result.rowCount === 0) {
    console.log(`ℹ️  Demo user ${DEMO_USER.email} already exists — skipped`);
  } else {
    console.log(`✅ Created demo user: ${DEMO_USER.email} / password: ${DEMO_USER.password}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const reset = process.argv.includes('--reset');
  const pool = new Pool(getDbConfig());

  let exitCode = 0;

  try {
    await seedProducts(pool, reset);
    await seedDemoUser(pool);
    console.log('🌱 Seed complete');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    exitCode = 1;
  } finally {
    await pool.end().catch((err) => console.error('Pool cleanup error:', err));
  }

  process.exit(exitCode);
}

main();
