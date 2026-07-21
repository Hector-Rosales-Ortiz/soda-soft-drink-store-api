'use strict';

/**
 * SQL table creation script.
 * Run with `node setupDatabase.js` (or `npm run setup-db`).
 *
 * Creates every table in dependency order and seeds a handful of soda
 * products so the API has data to serve immediately. Safe to re-run:
 * tables use CREATE TABLE IF NOT EXISTS and the seed is idempotent.
 */

const { pool } = require('./db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  flavor      VARCHAR(100),
  size        VARCHAR(50),
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total      NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  status     VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);
`;

const SEED = `
INSERT INTO products (name, description, price, stock, flavor, size, image_url)
SELECT * FROM (VALUES
  ('Classic Cola',      'The original crisp cola taste.',        1.99, 100, 'cola',     '330ml', NULL),
  ('Diet Cola',         'All the flavor, zero sugar.',           1.99, 100, 'cola',     '330ml', NULL),
  ('Lemon Lime Fizz',   'Refreshing citrus soda.',               1.79,  80, 'citrus',   '330ml', NULL),
  ('Orange Burst',      'Bold orange soda with real fizz.',      1.89,  75, 'orange',   '330ml', NULL),
  ('Root Beer',         'Creamy, old-fashioned root beer.',      2.09,  60, 'root beer','330ml', NULL),
  ('Grape Soda',        'Sweet and bubbly grape flavor.',        1.89,  50, 'grape',    '330ml', NULL),
  ('Ginger Ale',        'Smooth ginger with a gentle kick.',     1.99,  70, 'ginger',   '330ml', NULL),
  ('Cream Soda',        'Smooth vanilla cream soda.',            2.19,  40, 'vanilla',  '330ml', NULL)
) AS seed(name, description, price, stock, flavor, size, image_url)
WHERE NOT EXISTS (SELECT 1 FROM products);
`;

async function main() {
  const client = await pool.connect();
  try {
    console.log('⏳ Creating tables...');
    await client.query(SCHEMA);
    console.log('✅ Tables ready.');

    console.log('⏳ Seeding products...');
    const { rowCount } = await client.query(SEED);
    console.log(rowCount ? `✅ Seeded ${rowCount} products.` : 'ℹ️  Products already present — skipped seed.');
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .then(() => {
    console.log('🎉 Database setup complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database setup failed:', err);
    process.exit(1);
  });
