'use strict';

/**
 * Migration 001 – Add DB-level CHECK constraints.
 *
 * This migration is idempotent: it uses DO…EXCEPTION blocks so that running it
 * against a database that already has the constraints is a no-op.
 *
 * Constraints added:
 *   products   : price >= 0, stock >= 0
 *   cart_items : quantity >= 1
 *   orders     : total >= 0, status IN ('pending','processing','shipped','delivered','cancelled')
 *   order_items: quantity >= 1, price >= 0
 *
 * Usage:
 *   node db/migrations/001_add_check_constraints.js
 */

const { Pool } = require('pg');
require('dotenv').config();
const config = require('../../config');

/**
 * Adds a named CHECK constraint to `table` if one with that name does not
 * already exist.  Wraps each ALTER TABLE in a savepoint so a duplicate-object
 * error is caught without aborting the whole transaction.
 */
const constraints = [
  { table: 'products',     name: 'chk_products_price_non_negative',       expr: 'price >= 0' },
  { table: 'products',     name: 'chk_products_stock_non_negative',       expr: 'stock >= 0' },
  { table: 'cart_items',   name: 'chk_cart_items_quantity_positive',      expr: 'quantity >= 1' },
  { table: 'orders',       name: 'chk_orders_total_non_negative',         expr: 'total >= 0' },
  {
    table: 'orders',
    name: 'chk_orders_status_valid',
    expr: "status IN ('pending','processing','shipped','delivered','cancelled')",
  },
  { table: 'order_items',  name: 'chk_order_items_quantity_positive',     expr: 'quantity >= 1' },
  { table: 'order_items',  name: 'chk_order_items_price_non_negative',    expr: 'price >= 0' },
];

async function up() {
  const pool = new Pool({
    user:     process.env.DB_USER     || process.env.PGUSER     || config.db.user,
    host:     process.env.DB_HOST     || process.env.PGHOST     || config.db.host,
    database: process.env.DB_NAME     || process.env.PGDATABASE || config.db.database,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || config.db.password,
    port:     parseInt(process.env.DB_PORT || process.env.PGPORT || String(config.db.port), 10) || 5432,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { table, name, expr } of constraints) {
      // Use a savepoint per constraint so a duplicate_object error (42710)
      // only rolls back that one statement, not the whole migration.
      await client.query(`SAVEPOINT sp_${name}`);
      try {
        await client.query(
          `ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${expr})`
        );
        await client.query(`RELEASE SAVEPOINT sp_${name}`);
        console.log(`  ✅ Added constraint ${name} on ${table}`);
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT sp_${name}`);
        await client.query(`RELEASE SAVEPOINT sp_${name}`);
        if (err.code === '42710') {
          // duplicate_object – constraint already exists, skip
          console.log(`  ℹ️  Constraint ${name} already exists on ${table}, skipping`);
        } else {
          throw err;
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration 001 complete');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  up().catch((err) => {
    console.error('❌ Migration 001 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { up };
