'use strict';

const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const config = require('../config');
const User = require('../models/user');

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
        const user = await User.findById(payload.sub);
        return user ? done(null, user) : done(null, false);
      } catch (err) {
        return done(err, false);
      }
    })
  );

  return passport;
};
