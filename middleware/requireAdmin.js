'use strict';

const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

/**
 * Middleware that first verifies the JWT (sets req.user) and then ensures
 * the authenticated user has the `admin` role.
 *
 * Responds with 401 when no valid token is present and 403 when the user
 * is authenticated but is not an admin.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorised' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    return next();
  });
}

module.exports = requireAdmin;
