import { beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_key_at_least_32_characters_long_for_vitest';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.COOKIE_SAMESITE = 'lax';

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
  await mongoose.disconnect();
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
