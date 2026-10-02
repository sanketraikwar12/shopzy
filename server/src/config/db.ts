import mongoose from 'mongoose';
import { env, isProd } from './env';
import { logger } from './logger';

let memoryServer: { stop: () => Promise<unknown> } | null = null;

/**
 * Resolves the Mongo connection string.
 * If MONGODB_URI is not provided outside production we spin up an ephemeral
 * in-memory MongoDB so the project runs with zero local infrastructure.
 */
async function resolveUri(): Promise<string> {
  if (env.MONGODB_URI) return env.MONGODB_URI;
  if (isProd) throw new Error('MONGODB_URI must be set in production');

  logger.warn('MONGODB_URI not set — starting in-memory MongoDB (data is not persisted)');
  // Lazy require so the dependency is not needed in production images.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const server = await MongoMemoryServer.create({ instance: { dbName: 'shopzy' } });
  memoryServer = server;
  return server.getUri('shopzy');
}

export async function connectDatabase(): Promise<typeof mongoose> {
  const uri = await resolveUri();

  mongoose.set('strictQuery', true);
  if (!isProd) mongoose.set('debug', false);

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', { err: err.message }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
  });

  // Build indexes eagerly in dev/test; in production this is a migration step.
  if (!isProd) await mongoose.connection.syncIndexes?.().catch(() => undefined);

  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function dbHealth() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'] as const;
  const readyState = mongoose.connection.readyState as number;
  return { status: states[readyState] ?? 'unknown', name: mongoose.connection.name };
}
