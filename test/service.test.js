'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const dbPath = require.resolve('../db');
const bcryptPath = require.resolve('bcryptjs');
const jsonwebtokenPath = require.resolve('jsonwebtoken');
const servicePaths = [
  require.resolve('../services/AuthService'),
  require.resolve('../services/CartService'),
  require.resolve('../services/OrderService'),
  require.resolve('../services/UserService'),
];

function loadService(servicePath, dbExports) {
  const previousBcrypt = require.cache[bcryptPath];
  const previousJwt = require.cache[jsonwebtokenPath];
  const previousDb = require.cache[dbPath];

  require.cache[bcryptPath] = {
    id: bcryptPath,
    filename: bcryptPath,
    loaded: true,
    exports: {
      hash: async (password) => `hashed:${password}`,
      compare: async (password, hash) => hash === `hashed:${password}`,
    },
  };

  require.cache[jsonwebtokenPath] = {
    id: jsonwebtokenPath,
    filename: jsonwebtokenPath,
    loaded: true,
    exports: {
      sign: () => 'token',
    },
  };

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: dbExports,
  };

  for (const path of servicePaths) {
    delete require.cache[path];
  }

  const service = require(servicePath);

  if (previousBcrypt) {
    require.cache[bcryptPath] = previousBcrypt;
  } else {
    delete require.cache[bcryptPath];
  }

  if (previousJwt) {
    require.cache[jsonwebtokenPath] = previousJwt;
  } else {
    delete require.cache[jsonwebtokenPath];
  }

  if (previousDb) {
    require.cache[dbPath] = previousDb;
  } else {
    delete require.cache[dbPath];
  }

  return service;
}

function createStore() {
  const state = {
    nextIds: {
      user: 1,
      cart: 1,
      cartItem: 1,
      order: 1,
      orderItem: 1,
      product: 1,
    },
    users: [],
    carts: [],
    cartItems: [],
    products: [],
    orders: [],
    orderItems: [],
  };

  const createdAt = new Date('2026-07-21T00:00:00Z');

  function makeUser(data) {
    const user = {
      id: state.nextIds.user++,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role || 'customer',
      createdAt,
      save: async function save() {
        return this;
      },
    };

    state.users.push(user);
    return user;
  }

  function makeCart(userId) {
    const cart = {
      id: state.nextIds.cart++,
      userId,
      createdAt,
      updatedAt: createdAt,
    };

    state.carts.push(cart);
    return cart;
  }

  function makeProduct(data) {
    const product = {
      id: state.nextIds.product++,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      flavor: data.flavor,
      size: data.size,
      imageUrl: data.imageUrl,
      save: async function save() {
        return this;
      },
    };

    state.products.push(product);
    return product;
  }

  function makeCartItem(cartId, productId, quantity) {
    const item = {
      id: state.nextIds.cartItem++,
      cartId,
      productId,
      quantity,
      save: async function save() {
        return this;
      },
      destroy: async function destroy() {
        state.cartItems = state.cartItems.filter((current) => current !== item);
        return 1;
      },
    };

    state.cartItems.push(item);
    return item;
  }

  function makeOrder(data) {
    const order = {
      id: state.nextIds.order++,
      userId: data.userId,
      total: data.total,
      status: data.status,
      createdAt,
      save: async function save() {
        return this;
      },
    };

    state.orders.push(order);
    return order;
  }

  function makeOrderItem(data) {
    const item = {
      id: state.nextIds.orderItem++,
      orderId: data.orderId,
      productId: data.productId,
      quantity: data.quantity,
      price: data.price,
    };

    state.orderItems.push(item);
    return item;
  }

  const User = {
    findOne: async ({ where }) => state.users.find((user) => user.email === where.email) || null,
    create: async (data) => makeUser(data),
    scope: function scope() {
      return this;
    },
    findByPk: async (id) => state.users.find((user) => user.id === Number(id)) || null,
  };

  const Cart = {
    findOrCreate: async ({ where }) => {
      let cart = state.carts.find((current) => current.userId === where.userId);
      if (!cart) {
        cart = makeCart(where.userId);
        return [cart, true];
      }
      return [cart, false];
    },
  };

  const Product = {
    findByPk: async (id) => state.products.find((product) => product.id === Number(id)) || null,
  };

  const CartItem = {
    findAll: async ({ where }) =>
      state.cartItems
        .filter((item) => item.cartId === where.cartId)
        .map((item) => ({ ...item, Product: state.products.find((product) => product.id === item.productId) })),
    findOrCreate: async ({ where, defaults }) => {
      let item = state.cartItems.find(
        (current) => current.cartId === where.cartId && current.productId === where.productId
      );
      if (!item) {
        item = makeCartItem(where.cartId, where.productId, defaults.quantity);
        return [item, true];
      }
      return [item, false];
    },
    findOne: async ({ where }) =>
      state.cartItems.find(
        (item) => item.cartId === where.cartId && item.productId === where.productId
      ) || null,
    destroy: async ({ where }) => {
      const before = state.cartItems.length;
      state.cartItems = state.cartItems.filter((item) => {
        if (item.cartId !== where.cartId) {
          return true;
        }
        if (where.productId !== undefined && item.productId !== where.productId) {
          return true;
        }
        return false;
      });
      return before - state.cartItems.length;
    },
  };

  const Order = {
    create: async (data) => makeOrder(data),
    findAll: async ({ where }) =>
      state.orders
        .filter((order) => order.userId === where.userId)
        .sort((left, right) => right.createdAt - left.createdAt),
    findOne: async ({ where }) =>
      state.orders.find((order) => order.id === Number(where.id) && order.userId === where.userId) ||
      null,
  };

  const OrderItem = {
    bulkCreate: async (items) => items.map((item) => makeOrderItem(item)),
    findAll: async ({ where }) =>
      state.orderItems
        .filter((item) => item.orderId === where.orderId)
        .map((item) => ({ ...item, Product: state.products.find((product) => product.id === item.productId) })),
  };

  const sequelize = {
    transaction: async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }),
  };

  return {
    state,
    models: { User, Cart, CartItem, Product, Order, OrderItem },
    sequelize,
    seedProduct: (data) => makeProduct(data),
  };
}

test('auth service registers and logs in users', async () => {
  const store = createStore();
  const { register, login } = loadService('../services/AuthService', { models: store.models });

  const registration = await register({
    email: 'renee@example.com',
    name: 'Renee',
    password: 'secret123',
  });

  assert.equal(registration.user.email, 'renee@example.com');
  assert.equal(store.state.carts.length, 1);

  const loginResult = await login({
    email: 'renee@example.com',
    password: 'secret123',
  });

  assert.equal(loginResult.user.name, 'Renee');
  assert.ok(typeof loginResult.token === 'string' && loginResult.token.length > 0);
});

test('cart service queries and mutates cart lines correctly', async () => {
  const store = createStore();
  const product = store.seedProduct({
    name: 'Classic Cola',
    description: 'Original cola',
    price: 2.5,
    stock: 8,
    flavor: 'cola',
    size: '330ml',
  });
  const { getCart, addItem, updateItem, removeItem, clear } = loadService('../services/CartService', {
    models: store.models,
    sequelize: store.sequelize,
  });

  assert.deepEqual(await getCart(1), { id: 1, items: [], total: 0 });

  const afterAdd = await addItem(1, { productId: product.id, quantity: 2 });
  assert.equal(afterAdd.items[0].quantity, 2);
  assert.equal(afterAdd.total, 5);

  const afterUpdate = await updateItem(1, product.id, 1);
  assert.equal(afterUpdate.items[0].quantity, 1);

  const afterRemove = await removeItem(1, product.id);
  assert.equal(afterRemove.items.length, 0);

  await addItem(1, { productId: product.id, quantity: 2 });
  const afterClear = await clear(1);
  assert.equal(afterClear.items.length, 0);
});

test('cart service addItem rejects when requested quantity exceeds stock', async () => {
  const store = createStore();
  const product = store.seedProduct({
    name: 'Limited Edition Lime',
    description: 'Rare lime soda',
    price: 4.0,
    stock: 2,
    flavor: 'lime',
    size: '500ml',
  });
  const { addItem } = loadService('../services/CartService', {
    models: store.models,
    sequelize: store.sequelize,
  });

  // Requesting more than available stock must raise a 409 error.
  await assert.rejects(
    () => addItem(1, { productId: product.id, quantity: 5 }),
    (err) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /not enough stock/i);
      return true;
    }
  );

  // Adding exactly the available stock for a different user (fresh cart,
  // no stale item from the rolled-back call above) should succeed.
  const result = await addItem(2, { productId: product.id, quantity: 2 });
  assert.equal(result.items[0].quantity, 2);
});

test('order service checks out and fetches orders', async () => {
  const store = createStore();
  const product = store.seedProduct({
    name: 'Grape Soda',
    description: 'Sweet grape soda',
    price: 3,
    stock: 5,
    flavor: 'grape',
    size: '330ml',
  });
  await store.models.CartItem.findOrCreate({
    where: { cartId: 1, productId: product.id },
    defaults: { quantity: 2 },
  });

  const { createOrderFromCart, listOrders, getOrder } = loadService('../services/OrderService', {
    models: store.models,
    sequelize: store.sequelize,
  });

  const order = await createOrderFromCart(1);
  assert.equal(order.total, 6);
  assert.equal(order.items[0].quantity, 2);
  assert.equal(product.stock, 3);

  const orders = await listOrders(1);
  assert.equal(orders.length, 1);

  const fetchedOrder = await getOrder(1, order.id);
  assert.equal(fetchedOrder.id, order.id);
  assert.equal(fetchedOrder.items.length, 1);
});

test('user service reads and updates profile data', async () => {
  const store = createStore();
  const user = await store.models.User.create({
    email: 'user@example.com',
    name: 'Original Name',
    passwordHash: 'hash',
  });
  const { getProfile, updateProfile } = loadService('../services/UserService', {
    models: store.models,
  });

  assert.equal((await getProfile(user.id)).name, 'Original Name');

  const updated = await updateProfile(user.id, { name: 'Updated Name', email: 'updated@example.com' });
  assert.equal(updated.name, 'Updated Name');
  assert.equal(updated.email, 'updated@example.com');
});