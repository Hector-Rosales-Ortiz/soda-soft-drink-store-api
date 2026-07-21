'use strict';

const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

/**
 * Serve the standalone swagger.yml as interactive API docs at /api-docs.
 * (Team decision: keep all documentation in one file rather than inline.)
 */
module.exports = (app) => {
  try {
    const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('📖 API docs available at /api-docs');
  } catch (err) {
    console.warn('⚠️  Could not load swagger.yml — /api-docs disabled:', err.message);
  }
  return app;
};
