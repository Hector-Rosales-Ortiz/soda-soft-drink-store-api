'use strict';

/**
 * Cart model. Each user has exactly one cart (enforced by the unique userId).
 */
module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define(
    'Cart',
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'carts',
    }
  );

  return Cart;
};
