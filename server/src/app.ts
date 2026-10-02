import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoose from 'mongoose';
import { env, isProd } from './config/env';
import { dbHealth } from './config/db';
import { ApiError } from './utils/ApiError';
import { csrfProtection } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/error';
import { generalLimiter } from './middleware/rateLimit';
import { requestContext } from './middleware/requestContext';
import { mongoSanitize } from './middleware/sanitize';
import { UPLOAD_ROOT } from './middleware/upload';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  // Required for correct req.ip behind a load balancer / CDN. Honour the
  // explicit setting when given; otherwise assume one proxy hop in production.
  if (env.TRUST_PROXY || isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security headers (OWASP A05) -----------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", env.CLIENT_ORIGIN],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // --- Permissions-Policy: disable hardware/payment features (defence-in-depth)
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
    );
    next();
  });

  // --- CORS: explicit allow-list, never a wildcard with credentials ---------
  const allowedOrigins = env.CLIENT_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin / curl / server-to-server requests have no Origin header.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        // A bare Error would surface as an opaque 500; this keeps the rejection
        // an explicit 403 with the usual error envelope.
        return callback(ApiError.forbidden('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Session-Id', 'X-CSRF-Token'],
      exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
      maxAge: 86400,
    }),
  );

  // --- Parsers & hardening ---------------------------------------------------
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(csrfProtection);
  app.use(compression());
  app.use(hpp({ whitelist: ['tags', 'category'] })); // HTTP parameter pollution
  app.use(mongoSanitize); // NoSQL operator injection (A03)

  app.use(requestContext);

  // Uploaded media. In production this is served from S3/Cloudinary via the CDN.
  app.use(
    '/static/uploads',
    express.static(UPLOAD_ROOT, {
      maxAge: '7d',
      etag: true,
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  // --- Infrastructure Health Probes (Unthrottled for LBs/K8s) --------------
  app.get('/livez', (_req, res) => {
    res.status(200).json({ status: 'live', uptime: Math.round(process.uptime()), version: '1.0.0' });
  });

  app.get('/readyz', (_req, res) => {
    const isReady = mongoose.connection.readyState === 1;
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'degraded',
      database: dbHealth(),
    });
  });

  // --- API -------------------------------------------------------------------
  app.use(env.API_PREFIX, generalLimiter, routes);

  app.get('/', (_req, res) => {
    res.json({
      name: 'SHOPZY API',
      version: '1.0.0',
      docs: `${env.API_PREFIX}/health`,
      description: 'Local business discovery & price comparison platform',
    });
  });

  // robots.txt / sitemap hooks live on the web tier; the API stays out of the index.
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
