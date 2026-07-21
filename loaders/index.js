'use strict';

const passport = require('passport');

const expressLoader = require('./express');
const passportLoader = require('./passport');
const swaggerLoader = require('./swagger');

/**
 * Master setup loader. Runs the sub-loaders in the correct order:
 *   1. Passport strategy (must exist before express uses passport.initialize)
 *   2. Swagger docs (mount /api-docs BEFORE express registers its catch-all
 *      404 handler, otherwise the 404 would swallow the docs route)
 *   3. Express (middleware + routes + 404 + error handling)
 */
module.exports = (app) => {
  passportLoader(passport);
  swaggerLoader(app);
  expressLoader(app);
  return app;
};
