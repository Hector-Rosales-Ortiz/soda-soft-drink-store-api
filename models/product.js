'use strict';

/**
 * Soda drink product model.
 */
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      flavor: {
        type: DataTypes.STRING,
      },
      size: {
        type: DataTypes.STRING,
      },
      imageUrl: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'products',
    }
  );

  return Product;
};
