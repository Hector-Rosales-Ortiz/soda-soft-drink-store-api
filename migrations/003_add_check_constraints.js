'use strict';

module.exports = {
  name: '003_add_check_constraints',
  async up(pool) {
    await pool.query(`
      ALTER TABLE orders
      ADD CONSTRAINT chk_orders_status_valid
      CHECK (status IN ('pending','paid','shipped','delivered','cancelled'))
    `);
  },
};
