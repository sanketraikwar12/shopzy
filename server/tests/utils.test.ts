import { getOpenState, isOpenNow } from '../src/utils/hours';
import { distanceKm, roundKm } from '../src/utils/geo';
import { buildUniqueSlug, toSlug } from '../src/utils/slug';
import { hashKey } from '../src/utils/cache';

describe('getOpenState', () => {
  const schedule = (open: string, close: string, breaks?: Array<{ start: string; end: string }>) => ({
    timezone: 'Asia/Kolkata',
    schedule: {
      monday: { open, close, isOpen: true, breaks },
      tuesday: { open, close, isOpen: true, breaks },
      wednesday: { open, close, isOpen: true, breaks },
      thursday: { open, close, isOpen: true, breaks },
      friday: { open, close, isOpen: true, breaks },
      saturday: { open, close, isOpen: true, breaks },
      sunday: { open, close, isOpen: true, breaks },
    },
  });

  // 2026-08-05 is a Wednesday. 08:30 UTC = 14:00 IST.
  const wednesdayAfternoonIST = new Date('2026-08-05T08:30:00Z');
  const wednesdayEarlyMorningIST = new Date('2026-08-05T01:00:00Z'); // 06:30 IST

  it('reports open inside the window', () => {
    expect(getOpenState(schedule('10:00', '21:00'), wednesdayAfternoonIST).isOpenNow).toBe(true);
  });

  it('reports closed outside the window', () => {
    const state = getOpenState(schedule('10:00', '21:00'), wednesdayEarlyMorningIST);
    expect(state.isOpenNow).toBe(false);
    expect(state.reason).toBe('outside_hours');
  });

  it('handles a window that crosses midnight', () => {
    // 18:00 → 02:00; 06:30 IST is outside it, 14:00 IST is too.
    expect(isOpenNow(schedule('18:00', '02:00'), wednesdayEarlyMorningIST)).toBe(false);
    // 20:00 UTC = 01:30 IST next day, which IS inside the 18:00→02:00 window.
    expect(isOpenNow(schedule('18:00', '02:00'), new Date('2026-08-05T20:00:00Z'))).toBe(true);
  });

  it('reports a lunch break as closed', () => {
    const state = getOpenState(schedule('10:00', '21:00', [{ start: '13:30', end: '15:00' }]), wednesdayAfternoonIST);
    expect(state.isOpenNow).toBe(false);
    expect(state.reason).toBe('on_break');
  });

  it('honours an explicitly closed day', () => {
    const hours = {
      timezone: 'Asia/Kolkata',
      schedule: { wednesday: { isOpen: false } },
    };
    const state = getOpenState(hours, wednesdayAfternoonIST);
    expect(state.isOpenNow).toBe(false);
    expect(state.reason).toBe('closed_today');
  });

  it('honours a holiday override', () => {
    const hours = {
      ...schedule('10:00', '21:00'),
      specialHours: [{ date: '2026-08-05', isOpen: false, reason: 'Public holiday' }],
    };
    const state = getOpenState(hours, wednesdayAfternoonIST);
    expect(state.isOpenNow).toBe(false);
    expect(state.reason).toBe('special_closed');
  });

  it('returns unknown when no hours are published', () => {
    expect(getOpenState(undefined).reason).toBe('unknown');
  });

  it('evaluates in the shop timezone, not the server timezone', () => {
    // 20:00 UTC = 01:30 IST — a 10:00–21:00 IST shop is closed then.
    expect(isOpenNow(schedule('10:00', '21:00'), new Date('2026-08-05T20:00:00Z'))).toBe(false);
  });
});

describe('distanceKm', () => {
  it('returns zero for the same point', () => {
    expect(distanceKm([77.4126, 23.2599], [77.4126, 23.2599])).toBe(0);
  });

  it('computes a known distance (Bhopal → Indore ≈ 190 km)', () => {
    const km = distanceKm([77.4126, 23.2599], [75.8577, 22.7196]);
    expect(km).toBeGreaterThan(160);
    expect(km).toBeLessThan(200);
  });

  it('is symmetric', () => {
    const a: [number, number] = [77.4348, 23.2332];
    const b: [number, number] = [77.4256, 23.2178];
    expect(roundKm(distanceKm(a, b))).toBe(roundKm(distanceKm(b, a)));
  });
});

describe('slug helpers', () => {
  it('produces a URL-safe slug', () => {
    expect(toSlug('Modern Salon & Spa, MP Nagar!')).toBe('modern-salon-and-spa-mp-nagar');
  });

  it('appends a counter when the slug is taken', async () => {
    const taken = new Set(['modern-salon', 'modern-salon-2']);
    const slug = await buildUniqueSlug(['Modern Salon'], async (candidate) => taken.has(candidate));
    expect(slug).toBe('modern-salon-3');
  });

  it('falls back to a default for empty input', async () => {
    const slug = await buildUniqueSlug([''], async () => false);
    expect(slug).toBe('shop');
  });
});

describe('hashKey', () => {
  it('is stable for identical input', () => {
    expect(hashKey({ q: 'haircut', page: 1 })).toBe(hashKey({ q: 'haircut', page: 1 }));
  });

  it('differs for different input', () => {
    expect(hashKey({ q: 'haircut' })).not.toBe(hashKey({ q: 'pizza' }));
  });
});
