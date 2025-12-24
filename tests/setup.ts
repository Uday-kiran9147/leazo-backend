import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: any;

beforeAll(async () => {
  console.log('Test Setup: Starting MongoMemoryServer...');
  // Mock Redis
  jest.mock('../src/cache/RedisClientManager', () => ({
    RedisClientManager: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    },
  }));

  try {
    // Start MongoDB Memory Server
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    console.log(`Test Setup: MongoDB Memory Server started at ${uri}`);
    await mongoose.connect(uri);
    console.log('Test Setup: Connected to MongoDB Memory Server');
  } catch (error) {
    console.error('Test Setup: Failed to start or connect to MongoDB Memory Server', error);
    process.exit(1);
  }
});

afterAll(async () => {
  console.log('Test Setup: Cleaning up...');
  if (mongo) {
    await mongoose.connection.close();
    await mongo.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
