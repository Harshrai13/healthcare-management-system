/**
 * Standalone database seeder
 * Usage: npm run seed (from root) OR node src/seeds/seed.js (from server/)
 *
 * Seeds: admin/staff accounts, doctors, patients, services, sample appointments
 * To reset: clear MongoDB collections manually before running
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { seedDatabase } = require('./seedData');

async function run() {
  await connectDatabase();
  console.log('Connected to MongoDB');
  await seedDatabase();
  console.log('Seeding complete!');
  await disconnectDatabase();
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
