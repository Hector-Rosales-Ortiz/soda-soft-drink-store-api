'use strict';

/**
 * User / account model.
 *
 * The password hash is excluded by the default scope so it can never leak
 * through a normal query; use `User.scope('withPassword')` for login only.
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true, notEmpty: true },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'customer',
        validate: { isIn: [['customer', 'admin']] },
      },
    },
    {
      tableName: 'users',
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: {
        withPassword: { attributes: { include: ['passwordHash'] } },
      },
    }
  );

  return User;
};
