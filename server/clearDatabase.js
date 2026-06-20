require('dotenv').config();
const mongoose = require('mongoose');

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Load all models to register collections
    require('./src/models');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections`);

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }

    console.log('\n⚠️  Deleting ALL data...\n');

    for (const col of collections) {
      const result = await db.collection(col.name).deleteMany({});
      console.log(`  ✓ Cleared ${col.name}: ${result.deletedCount} documents deleted`);
    }

    console.log('\n✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error(' Error:', error.message);
    process.exit(1);
  }
}

clearDatabase();
