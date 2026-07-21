'use strict';

const Product = require('../models/product');
const { httpError } = require('./AuthService');

/**
 * Soda product filtering, validation and CRUD.
 */

async function list(queryParams = {}) {
  const limit = Math.min(parseInt(queryParams.limit, 10) || 50, 100);
  const offset = parseInt(queryParams.offset, 10) || 0;
  return Product.findAll({
    search: queryParams.search,
    flavor: queryParams.flavor,
    limit,
    offset,
  });
}

async function getById(id) {
  const product = await Product.findById(id);
  if (!product) throw httpError(404, 'Product not found');
  return product;
}

function validate({ name, price }) {
  if (!name || typeof name !== 'string') {
    throw httpError(400, 'Product name is required');
  }
  if (price == null || Number(price) < 0 || Number.isNaN(Number(price))) {
    throw httpError(400, 'Product price must be a non-negative number');
  }
}

async function create(data) {
  validate(data);
  return Product.create(data);
}

async function update(id, data) {
  await getById(id); // 404 if missing
  return Product.updateById(id, data);
}

async function remove(id) {
  const ok = await Product.deleteById(id);
  if (!ok) throw httpError(404, 'Product not found');
  return true;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
