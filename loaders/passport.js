'use strict';

const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const config = require('../config');
const { models } = require('../db');

const { User } = models;

/**
 * Configure the JWT authentication strategy.
 * The token is read from the `Authorization: Bearer <token>` header; on
 * success `req.user` is populated with the public user record.
 */
module.exports = (passport) => {
  const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwt.secret,
  };

  passport.use(
    new JwtStrategy(options, async (payload, done) => {
      try {
        const user = await User.findByPk(payload.sub);
        if (!user) return done(null, false);
        // Attach the role from the JWT payload so requireAdmin can read it
        // without a separate DB round-trip; the DB record is still the
        // authoritative source when the user is fetched.
        user.role = user.role ?? payload.role;
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );

  return passport;
};
