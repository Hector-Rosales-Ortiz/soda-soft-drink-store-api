'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');

const config = require('../config');
const routes = require('../routes');

/**
 * Wire up Express: body parsing, CORS, Passport, the API router, and the
 * central 404 / error handlers. Called by loaders/index.js.
 */
module.exports = (app) => {
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(passport.initialize());

  // Lightweight health check.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // All API routes live under /api.
  app.use('/api', routes);

  // 404 for anything unmatched.
  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
  });

  // Central error handler — services throw errors carrying a `.status`.
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
};
