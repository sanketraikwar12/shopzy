import winston from 'winston';
import { env, isProd } from './env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} ${level}: ${stack || message}${rest}`;
});

/**
 * Structured JSON logs in production (ready for ELK / CloudWatch ingestion),
 * human-readable coloured logs in development.
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'test' ? 'error' : isProd ? 'info' : 'debug',
  format: isProd
    ? combine(errors({ stack: true }), timestamp(), json())
    : combine(errors({ stack: true }), colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
  defaultMeta: { service: 'shopzy-api', env: env.NODE_ENV },
  transports: [new winston.transports.Console()],
});
