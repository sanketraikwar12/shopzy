import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-value-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value-at-least-32-chars';
process.env.BCRYPT_ROUNDS = '4'; // keep hashing fast in tests
process.env.RATE_LIMIT_AUTH = '1000';
process.env.RATE_LIMIT_GENERAL = '10000';
process.env.RATE_LIMIT_SEARCH = '10000';

let memoryServer: MongoMemoryServer;

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'shopzy-test' } });
  await mongoose.connect(memoryServer.getUri('shopzy-test'));
  await mongoose.connection.syncIndexes().catch(() => undefined);
}, 120_000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await memoryServer?.stop();
});

// Each test file starts from a clean slate.
afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});
