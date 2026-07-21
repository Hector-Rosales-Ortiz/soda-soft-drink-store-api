'use strict';

const express = require('express');

const config = require('./config');
const loaders = require('./loaders');
const { sequelize } = require('./db');

/**
 * Application entry point.
 * Verifies the database connection, creates the Express app, runs all
 * loaders, and starts listening.
 */
async function start() {
  // Fail fast with a clear message if the database is unreachable.
  try {
    await sequelize.authenticate();
    console.log('🗄️  Database connection OK');
  } catch (err) {
    console.error('❌ Unable to connect to the database:', err.message);
    console.error('   Check your .env credentials and that PostgreSQL is running.');
    process.exit(1);
  }

  const app = express();

  loaders(app);

  app.listen(config.port, () => {
    console.log(`🥤 Soda Store API running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   Swagger UI:  http://localhost:${config.port}/api-docs`);
    console.log(`   Scalar docs: http://localhost:${config.port}/reference`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
