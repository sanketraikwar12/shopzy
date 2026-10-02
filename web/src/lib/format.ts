/** Formatting and small display helpers shared across the UI. */

export function formatINR(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && value >= 1000) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-IN', { notation: value >= 10_000 ? 'compact' : 'standard' }).format(value);
}

export function formatDistance(km?: number): string | null {
  if (km === undefined || km === null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeTime(value: string | Date): string {
  const then = new Date(value).getTime();
  const diffSeconds = Math.round((then - Date.now()) / 1000);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3600],
    ['minute', 60],
  ];

  const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return 'just now';
}

/** "10:00" → "10:00 AM" */
export function formatTime(hhmm?: string): string {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const OPEN_STATE_LABELS: Record<string, string> = {
  open: 'Open now',
  closed_today: 'Closed today',
  outside_hours: 'Closed',
  on_break: 'On break',
  special_closed: 'Closed (holiday)',
  unknown: 'Hours not listed',
};

export function openStateLabel(reason: string): string {
  return OPEN_STATE_LABELS[reason] ?? 'Hours not listed';
}

export function discountLabel(type: string, value: number): string {
  if (type === 'percentage') return `${value}% OFF`;
  if (type === 'fixed') return `${formatINR(value)} OFF`;
  return 'BUY 1 GET 1';
}

/** Google Maps directions deep link — works on web and both mobile OSes. */
export function directionsUrl(coords?: [number, number], label?: string): string {
  if (!coords) return '#';
  const [lng, lat] = coords;
  const query = encodeURIComponent(label ? `${label}, ${lat},${lng}` : `${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Guards an untrusted URL before it reaches an `href` or `src`.
 *
 * Shop websites, avatars and photo URLs are owner/user supplied. The API
 * rejects non-http(s) schemes on write, but rows created before that check
 * existed are still in the database, so the render path validates too.
 * Returns null when the value is unsafe, so callers can hide the link.
 */
export function safeUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  // Our own upload paths and other site-relative URLs are always fine.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'http:' || protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

/** Debounce for search-as-you-type. */
export function debounce<T extends (...args: never[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
