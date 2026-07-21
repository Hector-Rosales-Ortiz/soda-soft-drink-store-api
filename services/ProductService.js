'use strict';

const { Op } = require('sequelize');

const { models } = require('../db');
const { httpError } = require('./AuthService');

const { Product } = models;

/**
 * Soda product filtering, validation and CRUD (backed by Sequelize).
 */

/** Shape a Product instance into the public API representation. */
function productDTO(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    stock: p.stock,
    flavor: p.flavor,
    size: p.size,
    image_url: p.imageUrl,
    created_at: p.createdAt,
  };
}

async function list(queryParams = {}) {
  const limit = Math.min(parseInt(queryParams.limit, 10) || 50, 100);
  const offset = parseInt(queryParams.offset, 10) || 0;

  const where = {};
  if (queryParams.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${queryParams.search}%` } },
      { description: { [Op.iLike]: `%${queryParams.search}%` } },
    ];
  }
  if (queryParams.flavor) {
    where.flavor = queryParams.flavor;
  }

  const products = await Product.findAll({
    where,
    order: [['name', 'ASC']],
    limit,
    offset,
  });
  return products.map(productDTO);
}

/** Fetch a product instance or throw 404. Internal helper (returns the model). */
async function getInstance(id) {
  const product = await Product.findByPk(id);
  if (!product) throw httpError(404, 'Product not found');
  return product;
}

async function getById(id) {
  return productDTO(await getInstance(id));
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
  const product = await Product.create({
    name: data.name,
    description: data.description,
    price: data.price,
    stock: data.stock ?? 0,
    flavor: data.flavor,
    size: data.size,
    imageUrl: data.imageUrl ?? data.image_url,
  });
  return productDTO(product);
}

async function update(id, data) {
  const product = await getInstance(id);
  await product.update({
    name: data.name ?? product.name,
    description: data.description ?? product.description,
    price: data.price ?? product.price,
    stock: data.stock ?? product.stock,
    flavor: data.flavor ?? product.flavor,
    size: data.size ?? product.size,
    imageUrl: data.imageUrl ?? data.image_url ?? product.imageUrl,
  });
  return productDTO(product);
}

async function remove(id) {
  const product = await getInstance(id);
  await product.destroy();
  return true;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  productDTO,
};
