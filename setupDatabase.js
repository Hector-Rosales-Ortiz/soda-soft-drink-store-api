'use strict';

const fs = require('node:fs');
const path = require('node:path');
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
    const existsResult = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      targetDatabase,
    ]);

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

async function getTargetPool() {
  return new Pool({
    ...dbConfig,
    database: targetDatabase,
  });
}

async function resetSchema(pool) {
  await pool.query('DROP TABLE IF EXISTS migrations');
  await pool.query('DROP TABLE IF EXISTS order_items');
  await pool.query('DROP TABLE IF EXISTS orders');
  await pool.query('DROP TABLE IF EXISTS cart_items');
  await pool.query('DROP TABLE IF EXISTS carts');
  await pool.query('DROP TABLE IF EXISTS products');
  await pool.query('DROP TABLE IF EXISTS users');
}

async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.js'))
    .sort();

  for (const fileName of migrationFiles) {
    const migration = require(path.join(migrationsDir, fileName));
    const applied = await pool.query('SELECT 1 FROM migrations WHERE name = $1', [
      migration.name || fileName,
    ]);

    if (applied.rowCount > 0) {
      continue;
    }

    console.log(`🔄 Running migration ${fileName}...`);
    await migration.up(pool);
    await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name || fileName]);
    console.log(`✅ Applied migration ${fileName}`);
  }
}

async function main() {
  let pool;
  let exitCode = 0;

  try {
    await ensureDatabase();
    pool = await getTargetPool();

    if (process.argv.includes('--force')) {
      console.log('🔄 Resetting schema...');
      await resetSchema(pool);
    }

    console.log('🔄 Running migrations...');
    await runMigrations(pool);
    console.log('✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Error creating database or running migrations:', err);
    exitCode = 1;
  } finally {
    if (pool) {
      await pool.end().catch((err) => console.error('Pool cleanup error:', err));
    }
  }

  process.exit(exitCode);
}

main();
