'use strict';

const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { apiReference } = require('@scalar/express-api-reference');

/**
 * Serve the API documentation. A single OpenAPI spec (swagger.yml) powers two
 * UIs (team decision: keep all docs in one file):
 *
 *   • /api-docs   — classic Swagger UI (kept for familiarity / try-it-out)
 *   • /reference  — Scalar API Reference (modern, nicer reading experience)
 *
 * NOTE: Scalar loads its render bundle from a CDN, so /reference needs
 * internet access at runtime. Swagger UI is fully self-hosted.
 */
module.exports = (app) => {
  let spec;
  try {
    spec = YAML.load(path.join(__dirname, '..', 'swagger.yml'));
  } catch (err) {
    console.warn('⚠️  Could not load swagger.yml — API docs disabled:', err.message);
    return app;
  }

  // Classic Swagger UI.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

  // Scalar API Reference — same spec, richer UI.
  app.use(
    '/reference',
    apiReference({
      content: spec,
      theme: 'purple',
      pageTitle: 'Soda Store API Reference',
    })
  );

  console.log('📖 Swagger UI at /api-docs · Scalar reference at /reference');
  return app;
};
