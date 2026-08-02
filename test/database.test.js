'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { Pool } = require('pg');

const repoRoot = path.resolve(__dirname, '..');
const setupScript = path.join(repoRoot, 'setupDatabase.js');

const adminConfig = {
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10) || 5432,
};

function createTestDatabaseName() {
  return `soda_soft_drink_store_test_${Date.now()}`;
}

async function dropDatabase(databaseName) {
  const adminPool = new Pool({
    ...adminConfig,
    database: 'postgres',
  });

  try {
    await adminPool.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName]
    );
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  } finally {
    await adminPool.end();
  }
}

test('setupDatabase.js creates the expected PostgreSQL tables via migrations', async () => {
  const databaseName = createTestDatabaseName();
  const env = {
    ...process.env,
    DB_NAME: databaseName,
  };

  const result = spawnSync(process.execPath, [setupScript], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `setupDatabase.js failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );

  const pool = new Pool({
    ...adminConfig,
    database: databaseName,
  });

  try {
    const { rows } = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );

    assert.deepEqual(
      rows.map((row) => row.table_name),
      ['cart_items', 'carts', 'migrations', 'order_items', 'orders', 'products', 'users']
    );

    const { rows: migrationRows } = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'migrations'`
    );
    assert.equal(migrationRows.length, 1);

    const { rows: productColumnRows } = await pool.query(
      `SELECT character_maximum_length
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'name'`
    );
    assert.equal(productColumnRows[0].character_maximum_length, 150);
  } finally {
    await pool.end();
    await dropDatabase(databaseName);
  }
});
