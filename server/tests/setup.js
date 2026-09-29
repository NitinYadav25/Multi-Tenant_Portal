import { beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';

// Set test environment variables at module root before imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_at_least_32_characters_long_for_vitest';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
process.env.COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'lax';

let mongoServer;

beforeAll(async () => {
  // If running in CI or standalone MongoDB is provided via MONGODB_URI
  const candidateUri = process.env.MONGODB_URI;
  if (candidateUri && candidateUri.startsWith('mongodb://')) {
    try {
      const poolId = process.env.VITEST_POOL_ID || process.pid;
      const url = new URL(candidateUri);
      const basePath = (url.pathname && url.pathname !== '/')
        ? url.pathname.replace(/^\//, '')
        : 'nexora_test';
      url.pathname = `/${basePath}_${poolId}`;
      const uri = url.toString();

      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
      return;
    } catch {
      // If candidate URI connection fails, fall through to MongoMemoryServer
    }
  }

  // Use local installed mongod binary if present for speed
  const localMongoBinary = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
  if (fs.existsSync(localMongoBinary)) {
    process.env.MONGOMS_SYSTEM_BINARY = localMongoBinary;
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      // ignore
    }
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

