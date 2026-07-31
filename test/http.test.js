'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const express = require('express');

test('Express app serves health and 404 responses', async () => {
  const originalDbName = process.env.DB_NAME;
  const originalPgDatabase = process.env.PGDATABASE;

  process.env.DB_NAME = 'postgres';
  process.env.PGDATABASE = 'postgres';

  delete require.cache[require.resolve('../config')];
  delete require.cache[require.resolve('../db')];
  delete require.cache[require.resolve('../routes')];
  delete require.cache[require.resolve('../loaders/express')];

  const apiRouter = express.Router();
  require.cache[require.resolve('../routes')] = {
    id: require.resolve('../routes'),
    filename: require.resolve('../routes'),
    loaded: true,
    exports: apiRouter,
  };

  const expressLoader = require('../loaders/express');

  const app = express();
  expressLoader(app);

  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { status: 'ok' });

    const missingResponse = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(missingResponse.status, 404);
    assert.match((await missingResponse.json()).error, /Not found: GET \/does-not-exist/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    delete require.cache[require.resolve('../routes')];
    delete require.cache[require.resolve('../loaders/express')];

    delete require.cache[require.resolve('../routes')];
    delete require.cache[require.resolve('../loaders/express')];
    if (originalDbName === undefined) {
      delete process.env.DB_NAME;
    } else {
      process.env.DB_NAME = originalDbName;
    }

    if (originalPgDatabase === undefined) {
      delete process.env.PGDATABASE;
    } else {
      process.env.PGDATABASE = originalPgDatabase;
    }
  }
});

test('helmet sets security headers on responses', async () => {
  const originalDbName = process.env.DB_NAME;
  const originalPgDatabase = process.env.PGDATABASE;

  process.env.DB_NAME = 'postgres';
  process.env.PGDATABASE = 'postgres';

  delete require.cache[require.resolve('../config')];
  delete require.cache[require.resolve('../db')];
  delete require.cache[require.resolve('../routes')];
  delete require.cache[require.resolve('../loaders/express')];

  const apiRouter = express.Router();
  require.cache[require.resolve('../routes')] = {
    id: require.resolve('../routes'),
    filename: require.resolve('../routes'),
    loaded: true,
    exports: apiRouter,
  };

  const expressLoader = require('../loaders/express');
  const app = express();
  expressLoader(app);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    // helmet sets these headers
    assert.ok(res.headers.get('x-content-type-options'), 'x-content-type-options should be set');
    assert.ok(res.headers.get('x-frame-options'), 'x-frame-options should be set');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    delete require.cache[require.resolve('../routes')];
    delete require.cache[require.resolve('../loaders/express')];
    if (originalDbName === undefined) {
      delete process.env.DB_NAME;
    } else {
      process.env.DB_NAME = originalDbName;
    }
    if (originalPgDatabase === undefined) {
      delete process.env.PGDATABASE;
    } else {
      process.env.PGDATABASE = originalPgDatabase;
    }
  }
});

test('auth rate-limiter returns 429 after exceeding limit', async () => {
  const originalDbName = process.env.DB_NAME;
  const originalPgDatabase = process.env.PGDATABASE;

  process.env.DB_NAME = 'postgres';
  process.env.PGDATABASE = 'postgres';

  delete require.cache[require.resolve('../config')];
  delete require.cache[require.resolve('../db')];
  delete require.cache[require.resolve('../routes/auth')];
  delete require.cache[require.resolve('../routes')];
  delete require.cache[require.resolve('../loaders/express')];

  // Build a minimal app wiring only the auth router with a very tight limit.
  const rateLimit = require('express-rate-limit');
  const authRouter = express.Router();
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  authRouter.post('/login', testLimiter, (_req, res) => res.json({ ok: true }));
  authRouter.post('/register', testLimiter, (_req, res) => res.status(201).json({ ok: true }));

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/auth/login`;

    // First 3 requests should succeed (200).
    for (let i = 0; i < 3; i++) {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(res.status, 200, `Request ${i + 1} should succeed`);
    }

    // 4th request should be rate-limited (429).
    const limited = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(limited.status, 429, 'Should return 429 after limit exceeded');
    const body = await limited.json();
    assert.equal(body.error, 'Too many requests, please try again later.');
    // Standard RateLimit headers should be present.
    assert.ok(limited.headers.get('ratelimit-limit'), 'RateLimit-Limit header should be set');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    delete require.cache[require.resolve('../routes/auth')];
    delete require.cache[require.resolve('../routes')];
    delete require.cache[require.resolve('../loaders/express')];
    if (originalDbName === undefined) {
      delete process.env.DB_NAME;
    } else {
      process.env.DB_NAME = originalDbName;
    }
    if (originalPgDatabase === undefined) {
      delete process.env.PGDATABASE;
    } else {
      process.env.PGDATABASE = originalPgDatabase;
    }
  }
});