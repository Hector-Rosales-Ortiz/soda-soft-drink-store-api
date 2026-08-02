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
