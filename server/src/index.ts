import type { Server } from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env, isProd } from './config/env';
import { logger } from './config/logger';
import { Shop } from './models/Shop';
import { cache } from './utils/cache';

let server: Server | undefined;

/**
 * The dev fallback database is in-memory and therefore empty on every boot,
 * so a separate `npm run seed` would never be visible to this process.
 * Seed it here instead when there is no data yet.
 */
async function autoSeedIfEmpty() {
  if (isProd || env.MONGODB_URI) return;

  const count = await Shop.estimatedDocumentCount();
  if (count > 0) return;

  logger.info('Empty database detected — loading the Bhopal demo dataset');
  const { seedDatabase } = await import('./seed/seed');
  await seedDatabase({ quiet: false });
}

async function bootstrap() {
  await connectDatabase();
  await autoSeedIfEmpty();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`SHOPZY API listening on http://localhost:${env.PORT}${env.API_PREFIX}`, {
      env: env.NODE_ENV,
      pid: process.pid,
    });
  });

  // Slightly above the typical ALB idle timeout to avoid 502s on keep-alive.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
}

/** Drain in-flight requests before exiting so rolling deploys are seamless. */
async function shutdown(signal: string, exitCode = 0) {
  logger.info(`Received ${signal}, shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    await new Promise<void>((resolve) => {
      if (!server) return resolve();
      server.close(() => resolve());
    });
    await disconnectDatabase();
    await cache.close();
    logger.info('Shutdown complete');
    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (err) {
    logger.error('Error during shutdown', { err: (err as Error).message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err: err.message, stack: err.stack });
  void shutdown('uncaughtException', 1);
});

bootstrap().catch((err) => {
  logger.error('Failed to start server', { err: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
