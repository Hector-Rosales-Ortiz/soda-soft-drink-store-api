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
    findByPk: async (id) => state.orders.find((order) => order.id === Number(id)) || null,
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

test('order service updateOrderStatus follows the state machine', async () => {
  const store = createStore();
  const product = store.seedProduct({
    name: 'Cherry Soda',
    description: 'Cherry flavoured soda',
    price: 2,
    stock: 10,
    flavor: 'cherry',
    size: '330ml',
  });
  await store.models.CartItem.findOrCreate({
    where: { cartId: 1, productId: product.id },
    defaults: { quantity: 1 },
  });

  const { createOrderFromCart, updateOrderStatus } = loadService('../services/OrderService', {
    models: store.models,
    sequelize: store.sequelize,
  });

  const order = await createOrderFromCart(1);
  assert.equal(order.status, 'pending');

  // Allowed transition: pending → paid
  const paid = await updateOrderStatus(order.id, 'paid');
  assert.equal(paid.status, 'paid');

  // Allowed transition: paid → shipped
  const shipped = await updateOrderStatus(order.id, 'shipped');
  assert.equal(shipped.status, 'shipped');

  // Allowed transition: shipped → delivered
  const delivered = await updateOrderStatus(order.id, 'delivered');
  assert.equal(delivered.status, 'delivered');

  // Illegal: delivered is terminal — any further transition must be rejected
  await assert.rejects(
    () => updateOrderStatus(order.id, 'cancelled'),
    (err) => {
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test('order service updateOrderStatus allows cancellation from pending and paid', async () => {
  const store = createStore();
  const product = store.seedProduct({
    name: 'Lemon Soda',
    description: 'Lemon flavoured soda',
    price: 1.5,
    stock: 10,
    flavor: 'lemon',
    size: '330ml',
  });

  const { createOrderFromCart, updateOrderStatus } = loadService('../services/OrderService', {
    models: store.models,
    sequelize: store.sequelize,
  });

  // First order: cancel directly from pending
  await store.models.CartItem.findOrCreate({
    where: { cartId: 1, productId: product.id },
    defaults: { quantity: 1 },
  });
  const order1 = await createOrderFromCart(1);
  const cancelled1 = await updateOrderStatus(order1.id, 'cancelled');
  assert.equal(cancelled1.status, 'cancelled');

  // Second order: advance to paid, then cancel
  await store.models.CartItem.findOrCreate({
    where: { cartId: 1, productId: product.id },
    defaults: { quantity: 1 },
  });
  const order2 = await createOrderFromCart(1);
  await updateOrderStatus(order2.id, 'paid');
  const cancelled2 = await updateOrderStatus(order2.id, 'cancelled');
  assert.equal(cancelled2.status, 'cancelled');
});

test('order service updateOrderStatus rejects illegal transitions with 409', async () => {
  const store = createStore();
  const product = store.seedProduct({
    name: 'Orange Soda',
    description: 'Orange flavoured soda',
    price: 2,
    stock: 10,
    flavor: 'orange',
    size: '330ml',
  });
  await store.models.CartItem.findOrCreate({
    where: { cartId: 1, productId: product.id },
    defaults: { quantity: 1 },
  });

  const { createOrderFromCart, updateOrderStatus } = loadService('../services/OrderService', {
    models: store.models,
    sequelize: store.sequelize,
  });

  const order = await createOrderFromCart(1);

  // pending → shipped is not allowed (must go via paid)
  await assert.rejects(
    () => updateOrderStatus(order.id, 'shipped'),
    (err) => {
      assert.equal(err.status, 409);
      return true;
    }
  );

  // pending → delivered is not allowed
  await assert.rejects(
    () => updateOrderStatus(order.id, 'delivered'),
    (err) => {
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test('order service updateOrderStatus rejects unknown status with 400', async () => {
  const store = createStore();
  const product = store.seedProduct({
    name: 'Grape Fizz',
    description: 'Grape fizzy drink',
    price: 1,
    stock: 5,
    flavor: 'grape',
    size: '500ml',
  });
  await store.models.CartItem.findOrCreate({
    where: { cartId: 1, productId: product.id },
    defaults: { quantity: 1 },
  });

  const { createOrderFromCart, updateOrderStatus } = loadService('../services/OrderService', {
    models: store.models,
    sequelize: store.sequelize,
  });

  const order = await createOrderFromCart(1);

  await assert.rejects(
    () => updateOrderStatus(order.id, 'invalid-status'),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});