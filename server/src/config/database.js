const mongoose = require('mongoose');

let mongoServer = null;

async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI;

    if (uri) {
      await mongoose.connect(uri);
      console.log('MongoDB connected successfully');
    } else {
      await startInMemoryMongo();
    }
  } catch (error) {
    console.warn('External MongoDB unavailable, falling back to in-memory:', error.message);
    try {
      await startInMemoryMongo();
    } catch (memError) {
      console.error('In-memory MongoDB also failed:', memError.message);
      process.exit(1);
    }
  }
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
