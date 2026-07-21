'use strict';

const express = require('express');

const config = require('./config');
const loaders = require('./loaders');

/**
 * Application entry point.
 * Creates the Express app, runs all loaders, and starts listening.
 */
async function start() {
  const app = express();

  loaders(app);

  app.listen(config.port, () => {
    console.log(`🥤 Soda Store API running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.env}`);
    console.log(`   API docs:    http://localhost:${config.port}/api-docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
