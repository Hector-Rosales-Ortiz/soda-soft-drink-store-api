'use strict';

module.exports = {
  name: '002_add_user_roles',
  async up(pool) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'customer'
    `);

    await pool.query(`
      UPDATE users
      SET role = 'customer'
      WHERE role IS NULL
    `);
  },
};