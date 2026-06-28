/**
 * Complete database clear script
 * Drops ALL collections and re-seeds with minimal admin + services data.
 * Usage: node src/seeds/clearDatabase.js (from server/)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../config/database');

async function clearAllCollections() {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  console.log(`\n  Found ${collections.length} collections to drop:`);

  for (const collection of collections) {
    try {
      await db.dropCollection(collection.name);
      console.log(`    ✓ Dropped: ${collection.name}`);
    } catch (err) {
      // Some collections can't be dropped if they're system collections
      console.log(`    ✗ Skipped: ${collection.name} (${err.message})`);
    }
  }
}

async function run() {
  console.log('═'.repeat(60));
  console.log('  VerdantCare — Complete Database Clear');
  console.log('═'.repeat(60));

  await connectDatabase();
  console.log('\n✓ Connected to MongoDB');

  await clearAllCollections();

  console.log('\n─'.repeat(60));
  console.log('  Re-seeding minimal data (admin + services)...');
  console.log('─'.repeat(60));

  // Re-seed with admin + services
  const { seedDatabase } = require('./seedData');
  await seedDatabase();

  // Re-seed email templates
  const { seedEmailTemplates } = require('./seedEmailTemplates');
  await seedEmailTemplates();
  console.log('  Email templates seeded');

  console.log('\n' + '═'.repeat(60));
  console.log('  Database cleared and re-seeded successfully!');
  console.log('  Admin login: admin@verdantcare.com / VerdantCare@2024!');
  console.log('═'.repeat(60) + '\n');

  await disconnectDatabase();
  process.exit(0);
}

run().catch((err) => {
  console.error('\n✗ Clear failed:', err);
  process.exit(1);
});
