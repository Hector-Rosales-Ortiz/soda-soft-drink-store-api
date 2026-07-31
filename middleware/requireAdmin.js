'use strict';

const { httpError } = require('../services/AuthService');

/**
 * Express middleware that rejects requests from non-admin users with 403.
 * Must be used after passport JWT authentication so that req.user is populated.
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return next(httpError(403, 'Admin access required'));
  }
  next();
}

module.exports = requireAdmin;
