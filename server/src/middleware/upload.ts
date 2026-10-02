import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    // Never trust the client filename — generate our own (path traversal, A08).
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ALLOWED_EXT.has(ext) ? ext : '.jpg'}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
      cb(ApiError.badRequest('Only JPEG, PNG, WebP or AVIF images up to 5MB are allowed'));
      return;
    }
    cb(null, true);
  },
});

/** Public URL for a stored file (swap for a Cloudinary/S3 URL when configured). */
export function publicUrl(filename: string): string {
  return `/static/uploads/${filename}`;
}

const PUBLIC_PREFIX = '/static/uploads/';

/**
 * Deletes a locally stored upload given its public URL, so removing a photo
 * does not leave the file orphaned on disk. Ignores anything that is not one of
 * our own local uploads (e.g. a seeded or CDN URL) and never throws.
 */
export async function removeStoredFile(url: string): Promise<void> {
  if (!url.startsWith(PUBLIC_PREFIX)) return;

  // basename() so a crafted URL can never escape the upload directory (A01/A08).
  const filename = path.basename(url.slice(PUBLIC_PREFIX.length));
  if (!filename || filename === '.' || filename === '..') return;

  try {
    await fs.promises.unlink(path.join(uploadRoot, filename));
  } catch {
    // Already gone, or stored elsewhere — nothing to reclaim.
  }
}

export const UPLOAD_ROOT = uploadRoot;
