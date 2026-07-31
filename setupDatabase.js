'use strict';

const { Pool } = require('pg');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
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

function createDatabaseUrl() {
  const databaseUrl = new URL('postgres://localhost');
  databaseUrl.hostname = dbConfig.host;
  databaseUrl.port = String(dbConfig.port);
  databaseUrl.pathname = `/${targetDatabase}`;
  databaseUrl.username = dbConfig.user;
  databaseUrl.password = dbConfig.password;

  return databaseUrl.toString();
}

function runMigrations() {
  const sequelizeCliEntry = require.resolve('sequelize-cli/lib/sequelize');
  const migrationsPath = path.resolve(__dirname, 'db', 'migrations');

  console.log('🔄 Running database migrations...');

  const result = spawnSync(
    process.execPath,
    [sequelizeCliEntry, 'db:migrate', '--url', createDatabaseUrl(), '--migrations-path', migrationsPath],
    {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
      stdio: 'inherit',
    }
  );

  if (result.status !== 0) {
    throw new Error('Migration command failed');
  }

  console.log('✅ Migrations completed successfully!');
}

async function main() {
  let exitCode = 0;

  try {
    await ensureDatabase();
    runMigrations();
  } catch (err) {
    console.error('❌ Error creating database or running migrations:', err);
    exitCode = 1;
  }

  process.exit(exitCode);
}

main();
