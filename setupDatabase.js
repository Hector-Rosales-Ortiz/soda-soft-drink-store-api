'use strict';

/**
 * Database setup script (Sequelize).
 * Run with `node setupDatabase.js` (or `npm run setup-db`).
 *
 * Creates/updates every table from the model definitions and seeds a handful
 * of soda products so the API has data to serve immediately.
 *
 * Flags:
 *   --force   DROP and recreate all tables (destroys existing data)
 *   --alter   Adjust existing tables to match the models (keeps data)
 */

const { sequelize, models } = require('./db');

const SEED_PRODUCTS = [
  { name: 'Classic Cola',    description: 'The original crisp cola taste.',    price: 1.99, stock: 100, flavor: 'cola',      size: '330ml' },
  { name: 'Diet Cola',       description: 'All the flavor, zero sugar.',       price: 1.99, stock: 100, flavor: 'cola',      size: '330ml' },
  { name: 'Lemon Lime Fizz', description: 'Refreshing citrus soda.',           price: 1.79, stock: 80,  flavor: 'citrus',    size: '330ml' },
  { name: 'Orange Burst',    description: 'Bold orange soda with real fizz.',  price: 1.89, stock: 75,  flavor: 'orange',    size: '330ml' },
  { name: 'Root Beer',       description: 'Creamy, old-fashioned root beer.',  price: 2.09, stock: 60,  flavor: 'root beer', size: '330ml' },
  { name: 'Grape Soda',      description: 'Sweet and bubbly grape flavor.',    price: 1.89, stock: 50,  flavor: 'grape',     size: '330ml' },
  { name: 'Ginger Ale',      description: 'Smooth ginger with a gentle kick.', price: 1.99, stock: 70,  flavor: 'ginger',    size: '330ml' },
  { name: 'Cream Soda',      description: 'Smooth vanilla cream soda.',        price: 2.19, stock: 40,  flavor: 'vanilla',   size: '330ml' },
];

async function main() {
  const force = process.argv.includes('--force');
  const alter = process.argv.includes('--alter');

  await sequelize.authenticate();
  console.log('🗄️  Connected to the database.');

  console.log(`⏳ Syncing tables${force ? ' (force)' : alter ? ' (alter)' : ''}...`);
  await sequelize.sync({ force, alter });
  console.log('✅ Tables ready.');

  console.log('⏳ Seeding products...');
  const existing = await models.Product.count();
  if (existing === 0) {
    await models.Product.bulkCreate(SEED_PRODUCTS);
    console.log(`✅ Seeded ${SEED_PRODUCTS.length} products.`);
  } else {
    console.log(`ℹ️  ${existing} products already present — skipped seed.`);
  }
}

main()
  .then(async () => {
    await sequelize.close();
    console.log('🎉 Database setup complete.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Database setup failed:', err.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
