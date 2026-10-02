import slugify from 'slugify';

/**
 * Builds a URL-safe, unique slug: "Modern Salon" + "MP Nagar" → "modern-salon-mp-nagar".
 * `exists` lets the caller check the database so collisions get a numeric suffix.
 */
export async function buildUniqueSlug(
  parts: Array<string | undefined>,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base =
    slugify(parts.filter(Boolean).join(' '), { lower: true, strict: true, trim: true }).slice(0, 80) || 'shop';

  let candidate = base;
  let counter = 1;
  // Bounded loop — after 50 tries fall back to a random suffix.
  while (await exists(candidate)) {
    counter += 1;
    if (counter > 50) return `${base}-${Math.random().toString(36).slice(2, 8)}`;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

export function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

/**
 * Escapes a user-supplied string for safe use inside `new RegExp`.
 *
 * Truncation happens *before* escaping — slicing afterwards can split a `\x`
 * escape pair and leave a dangling backslash, which makes RegExp throw and
 * turns any over-long search term into a 500.
 */
export function escapeRegex(input: string, maxLength = 100): string {
  return input.slice(0, maxLength).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive exact-match RegExp for an untrusted value. */
export function exactMatchRegex(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

/** Case-insensitive contains RegExp for an untrusted value. */
export function containsRegex(value: string): RegExp {
  return new RegExp(escapeRegex(value), 'i');
}
