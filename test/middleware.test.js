'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

// ---------------------------------------------------------------------------
// Helpers to build lightweight mock req / res / next objects
// ---------------------------------------------------------------------------

function mockReq(overrides = {}) {
  return {
    headers: {},
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    ...overrides,
  };
}

function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Minimal passport stub so we can test requireAdmin without a real DB
// ---------------------------------------------------------------------------

function loadRequireAdmin({ passportUser }) {
  const passportPath = require.resolve('passport');
  const requireAdminPath = require.resolve('../middleware/requireAdmin');

  const previousPassport = require.cache[passportPath];
  delete require.cache[requireAdminPath];

  require.cache[passportPath] = {
    id: passportPath,
    filename: passportPath,
    loaded: true,
    exports: {
      authenticate: (_strategy, _opts) => (req, _res, next) => {
        req.user = passportUser;
        next();
      },
    },
  };

  const requireAdmin = require(requireAdminPath);

  // Restore passport
  if (previousPassport) {
    require.cache[passportPath] = previousPassport;
  } else {
    delete require.cache[passportPath];
  }

  delete require.cache[requireAdminPath];

  return requireAdmin;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('requireAdmin: allows a request when req.user has role admin', async () => {
  const requireAdmin = loadRequireAdmin({ passportUser: { id: 1, role: 'admin' } });

  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;

  await new Promise((resolve) => {
    requireAdmin(req, res, () => {
      nextCalled = true;
      resolve();
    });
  });

  assert.ok(nextCalled, 'next() should have been called for admin user');
  assert.equal(res._status, null, 'no status should be set when admin is authorised');
});

test('requireAdmin: returns 403 when req.user has role customer', async () => {
  const requireAdmin = loadRequireAdmin({ passportUser: { id: 2, role: 'customer' } });

  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;

  await new Promise((resolve) => {
    requireAdmin(req, res, () => {
      nextCalled = true;
      resolve();
    });
    // Give synchronous path time to settle
    setImmediate(resolve);
  });

  assert.ok(!nextCalled, 'next() should NOT be called for a customer');
  assert.equal(res._status, 403);
  assert.match(res._body.error, /admin/i);
});

test('requireAdmin: returns 401 when passport sets no user (unauthenticated)', async () => {
  const requireAdmin = loadRequireAdmin({ passportUser: null });

  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;

  await new Promise((resolve) => {
    requireAdmin(req, res, () => {
      nextCalled = true;
      resolve();
    });
    setImmediate(resolve);
  });

  assert.ok(!nextCalled, 'next() should NOT be called when no user is set');
  assert.equal(res._status, 401);
});
