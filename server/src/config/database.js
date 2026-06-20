const mongoose = require('mongoose');

let mongoServer = null;

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
      if (isProduction) {
        // In production, we MUST have a real database — exit clearly
        console.error('MONGODB_URI connection failed in production. Cannot start without a valid database.');
        process.exit(1);
      }
      // Dev only: fall back to in-memory
      console.warn('Falling back to in-memory MongoDB for development...');
      await startInMemoryMongo();
      return;
    }
  }

  // No MONGODB_URI set
  if (isProduction) {
    console.error('MONGODB_URI environment variable is required in production. Please set it on Render.');
    process.exit(1);
  }

  // Dev only: use in-memory
  console.warn('No MONGODB_URI set — starting in-memory MongoDB for development...');
  await startInMemoryMongo();
}

async function startInMemoryMongo() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log(`In-memory MongoDB connected at ${uri}`);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

module.exports = { connectDatabase, disconnectDatabase };
