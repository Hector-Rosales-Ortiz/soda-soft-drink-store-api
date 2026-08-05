'use strict';

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    const err = new Error('Admin access required');
    err.status = 403;
    return next(err);
  }

  return next();
};
