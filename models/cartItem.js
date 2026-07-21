'use strict';

/**
 * Individual cart entry (a product + quantity inside a cart).
 * The composite unique index keeps a product to a single row per cart.
 */
module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define(
    'CartItem',
    {
      cartId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
    },
    {
      tableName: 'cart_items',
      indexes: [{ unique: true, fields: ['cart_id', 'product_id'] }],
    }
  );

  return CartItem;
};
