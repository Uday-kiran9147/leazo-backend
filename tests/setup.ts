process.env.TZ = 'Asia/Kolkata';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'dummy_secret';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { BackgroundService } from '../src/utils/BackgroundService';

let mongo: any;

// Mock Upstash Redis package-level
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    pipeline: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  })),
}));

// Mock chalk to avoid ESM issues with chalk v5 in Jest environments
jest.mock('chalk', () => {
  const identity = (s: any) => s;
  const color = Object.assign((s: any) => s, { bold: identity });
  return {
    blue: color,
    green: color,
    yellow: color,
    red: color,
    white: identity,
    cyan: identity,
    dim: identity,
    bgRed: {
      white: color,
    },
    magenta: color,
  };
});

// Global Mock Redis Client Manager
jest.mock('../src/cache/RedisClientManager', () => ({
  RedisClientManager: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(false),
    incr: jest.fn().mockResolvedValue(0),
    getInstance: jest.fn().mockReturnValue({
      pipeline: jest.fn().mockReturnValue({
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      del: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    }),
  },
}));

// Global Mock BackgroundService to prevent leaks between tests
jest.mock('../src/utils/BackgroundService', () => ({
  BackgroundService: {
    trackActivity: jest.fn(),
    sendNotification: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Email Service
jest.mock('../src/utils/mail', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Set global timeout for CI
jest.setTimeout(30000);

beforeAll(async () => {
  console.log('Test Setup: Starting MongoMemoryServer...');

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

  // Stop background processing to avoid MongoClientClosedError
  await BackgroundService.stop();

  if (mongo) {
    await mongoose.connection.close();
    await mongo.stop();
  }
});

// Silence expected warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (args[0]?.toString().includes('[Upstash Redis]')) return;
  if (args[0]?.toString().includes('Firebase not initialized')) return;
  originalWarn(...args);
};

console.error = (...args) => {
  if (args[0]?.toString().includes('registration token is not a valid FCM registration token')) return;
  if (args[0]?.toString().includes('FAILED_PRECONDITION')) return;
  if (args[0]?.toString().includes('Razorpay credentials not configured')) return;
  originalError(...args);
};

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
