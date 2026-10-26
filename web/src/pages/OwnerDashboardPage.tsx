import clsx from 'clsx';
import {
  BarChart3,
  Check,
  Clock,
  Eye,
  ImagePlus,
  Images,
  MousePointerClick,
  Navigation,
  Plus,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, FieldError, LoadingBlock, Modal, OpenBadge, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { LocationPicker } from '@/components/LocationPicker';
import { ShopEditor } from '@/components/ShopEditor';
import { formatCount, formatINR, formatTime, openStateLabel, titleCase } from '@/lib/format';
import { useDocumentMeta } from '@/lib/hooks';
import {
  useCategories,
  useCreateShop,
  useDeleteShopImage,
  useMyShops,
  useShopAnalytics,
  useUpdateShop,
  useUploadImages,
} from '@/lib/queries';
import { useToasts } from '@/store';
import type { DaySchedule, ShopDetail } from '@/types';

const VERIFICATION_VARIANTS = {
  verified: 'success',
  pending: 'warning',
  under_review: 'brand',
  rejected: 'danger',
} as const;

export function OwnerDashboardPage() {
  useDocumentMeta('Owner dashboard | SHOPZY', 'Manage your shop listing, prices and performance analytics.');

  const { data: shops = [], isLoading } = useMyShops();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<'overview' | 'edit'>('overview');

  const selected = shops.find((s) => s.id === selectedId) ?? shops[0];

  if (isLoading) return <LoadingBlock label="Loading your shops…" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Owner dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            {shops.length === 0
              ? 'List your first shop to start reaching nearby customers.'
              : `Managing ${shops.length} shop${shops.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary btn-md">
          <Plus size={16} aria-hidden />
          Add a shop
        </button>
      </header>

      {shops.length === 0 ? (
        <EmptyState
          icon={<Store className="size-8" />}
          title="You haven't listed a shop yet"
          description="Publish your business with its price list and start appearing in local searches within minutes."
          action={
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary btn-md">
              <Plus size={16} aria-hidden />
              List your shop
            </button>
          }
        />
      ) : (
        <>
          {shops.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => setSelectedId(shop.id)}
                  className={clsx(
                    'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                    selected?.id === shop.id
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                  )}
                >
                  {shop.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              <div role="tablist" className="mb-5 flex gap-1 border-b border-ink-200">
                {(
                  [
                    ['overview', 'Overview & performance'],
                    ['edit', 'Edit listing & prices'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => setView(key)}
                    className={clsx(
                      '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                      view === key
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {view === 'overview' ? (
                <ShopOverview shop={selected} onEditPrices={() => setView('edit')} />
              ) : (
                <ShopEditor shop={selected} />
              )}
            </>
          )}
        </>
      )}

      <CreateShopModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setSelectedId(id);
          setView('edit');
        }}
      />
    </div>
  );
}

function ShopOverview({ shop, onEditPrices }: { shop: ShopDetail; onEditPrices?: () => void }) {
  const { data: analytics, isLoading } = useShopAnalytics(shop.id);

  const status = shop.verification.status as keyof typeof VERIFICATION_VARIANTS;

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ink-900">{shop.name}</h2>
            <Badge variant={VERIFICATION_VARIANTS[status] ?? 'neutral'}>{titleCase(status.replace('_', ' '))}</Badge>
            {shop.isFeatured && <Badge variant="brand">Featured</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {titleCase(shop.category)} · {shop.location.address}, {shop.location.city}
          </p>

          {status === 'pending' && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <span className="font-semibold">Super Admin approval required:</span> Your shop is currently private. It cannot be published or seen by customers until Super Admin grants permission.
            </div>
          )}
          {status === 'under_review' && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <span className="font-semibold">Under Super Admin Review:</span> Changes were made to critical shop details. Your shop is temporarily private until re-verified.
            </div>
          )}
          {status === 'rejected' && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
              <span className="font-semibold">Rejected by Super Admin:</span> {shop.verification?.rejectionReason || 'Verification was rejected. Please review your details and contact administrator.'}
            </div>
          )}
          {status === 'verified' && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 inline-block" />
              Approved & Published by Super Admin — Live to customers across search & categories.
            </div>
          )}
        </div>

        <Link to={`/shop/${shop.slug}`} className="btn-secondary btn-sm shrink-0">
          {status === 'verified' ? 'View live public page' : 'Preview listing (Private)'}
        </Link>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading analytics…" />
      ) : analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Eye className="size-4" />}
              label="Profile views"
              value={formatCount(analytics.totals.views)}
              hint={`${formatCount(analytics.totals.uniqueViews)} unique`}
            />
            <MetricCard
              icon={<MousePointerClick className="size-4" />}
              label="Call clicks"
              value={formatCount(analytics.totals.callClicks)}
              hint={`${analytics.conversionRate}% of views act`}
            />
            <MetricCard
              icon={<Navigation className="size-4" />}
              label="Direction requests"
              value={formatCount(analytics.totals.directionClicks)}
            />
            <MetricCard
              icon={<Star className="size-4" />}
              label="Rating"
              value={analytics.totals.rating ? analytics.totals.rating.toFixed(1) : '—'}
              hint={`${formatCount(analytics.totals.reviewCount)} reviews`}
            />
          </div>

          <div className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <BarChart3 size={15} aria-hidden />
              Last 30 days
            </h3>
            <ActivityChart data={analytics.daily} />
          </div>
        </>
      ) : null}

      <PhotoManager shop={shop} />

      <HoursCard shop={shop} />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-ink-900">Price list ({shop.pricing.items.length} items)</h3>
            {onEditPrices && (
              <button
                type="button"
                onClick={onEditPrices}
                className="btn-secondary btn-sm text-xs py-1 px-2.5"
              >
                Manage Price List
              </button>
            )}
          </div>
          <Link to={`/shop/${shop.slug}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View on public page →
          </Link>
        </div>

        {shop.pricing.items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-ink-500">
              No items published yet. A price list is what makes your shop appear in price comparisons.
            </p>
            {onEditPrices && (
              <button
                type="button"
                onClick={onEditPrices}
                className="btn-primary btn-sm mt-3 inline-flex items-center gap-1.5"
              >
                <Plus size={15} aria-hidden />
                Add items to price list
              </button>
            )}
          </div>
        ) : (
          <ul className="max-h-96 divide-y divide-ink-100 overflow-y-auto">
            {shop.pricing.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-800">{item.name}</p>
                  {item.category && <p className="text-xs text-ink-500">{item.category}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-ink-900">{formatINR(item.price)}</p>
                  {item.unit && <p className="text-xs text-ink-400">{item.unit}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <span className="text-brand-600">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

/** Lightweight inline bar chart — no charting dependency for three series. */
function ActivityChart({ data }: { data: Array<{ date: string; views: number; calls: number; directions: number }> }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-400">No activity recorded yet.</p>;
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(1, ...sorted.map((d) => d.views + d.calls + d.directions));

  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Daily activity for the last 30 days">
        {sorted.map((d) => {
          const total = d.views + d.calls + d.directions;
          return (
            <div
              key={d.date}
              className="group relative flex-1 rounded-t bg-brand-500/80 transition-colors hover:bg-brand-600"
              style={{ height: `${Math.max(3, (total / max) * 100)}%` }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2 py-1 text-[11px] text-white group-hover:block">
                {d.date}: {d.views} views · {d.calls} calls · {d.directions} directions
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-400">
        <span>{sorted[0]?.date}</span>
        <span>{sorted[sorted.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// --- Photos ------------------------------------------------------------------

const MAX_PHOTOS = 20; // mirrors the server-side cap
const MAX_PER_UPLOAD = 10; // multer's `files` limit
const MAX_FILE_MB = 5; // mirrors MAX_UPLOAD_MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** Rejects what the API would reject anyway, so the owner gets the error instantly. */
function screenFiles(files: File[], remaining: number): { accepted: File[]; error?: string } {
  const wrongType = files.filter((f) => !ACCEPTED_TYPES.includes(f.type));
  const tooLarge = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
  const valid = files.filter((f) => !wrongType.includes(f) && !tooLarge.includes(f));

  const problems: string[] = [];
  if (wrongType.length) problems.push(`${wrongType.length} skipped — only JPEG, PNG, WebP or AVIF are allowed`);
  if (tooLarge.length) problems.push(`${tooLarge.length} skipped — each image must be under ${MAX_FILE_MB}MB`);

  const limit = Math.min(remaining, MAX_PER_UPLOAD);
  if (valid.length > limit) {
    problems.push(
      remaining < MAX_PER_UPLOAD
        ? `only ${limit} more photo${limit === 1 ? '' : 's'} will fit`
        : `at most ${MAX_PER_UPLOAD} photos per upload`,
    );
  }

  return { accepted: valid.slice(0, limit), error: problems.join('; ') || undefined };
}

/** Exported so the admin panel can offer the same photo tools on any shop. */
export function PhotoManager({ shop }: { shop: ShopDetail }) {
  const uploadImages = useUploadImages(shop.id, shop.slug);
  const deleteImage = useDeleteShopImage(shop.id, shop.slug);
  const updateShop = useUpdateShop(shop.id);
  const push = useToasts((s) => s.push);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const photos = shop.media.photos;
  const remaining = MAX_PHOTOS - photos.length;
  const isFull = remaining <= 0;

  function handleFiles(fileList: FileList | null) {
    setError('');
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    if (isFull) {
      setError(`You have reached the ${MAX_PHOTOS}-photo limit. Remove a photo to add another.`);
      return;
    }

    const { accepted, error: screenError } = screenFiles(files, remaining);
    if (screenError) setError(screenError);
    if (accepted.length === 0) return;

    uploadImages.mutate(accepted, {
      onSuccess: (data) => push(`${data.photos.length} photo${data.photos.length === 1 ? '' : 's'} uploaded`, 'success'),
      onError: (err) => setError((err as Error).message),
    });
  }

  function setCover(url: string) {
    setPendingUrl(url);
    updateShop.mutate(
      { coverImage: url },
      {
        onSuccess: () => push('Cover photo updated', 'success'),
        onError: (err) => setError((err as Error).message),
        onSettled: () => setPendingUrl(null),
      },
    );
  }

  function removePhoto(url: string) {
    setPendingUrl(url);
    deleteImage.mutate(url, {
      onSuccess: () => push('Photo removed', 'success'),
      onError: (err) => setError((err as Error).message),
      onSettled: () => setPendingUrl(null),
    });
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Images size={15} aria-hidden />
          Photos ({photos.length}/{MAX_PHOTOS})
        </h3>
        <p className="text-xs text-ink-500">Shops with photos get noticeably more calls and visits.</p>
      </div>

      <div className="space-y-4 p-5">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Drop zone — the label keeps the hidden input reachable by keyboard. */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!isFull) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={clsx(
            'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
            isFull
              ? 'cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400'
              : dragActive
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-ink-300 bg-ink-50/60 text-ink-500 hover:border-brand-400 hover:bg-brand-50/40',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            disabled={isFull || uploadImages.isPending}
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = ''; // allow re-picking the same file after an error
            }}
          />

          {uploadImages.isPending ? (
            <>
              <Spinner className="size-6" />
              <span className="text-sm font-medium">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus className="size-6" aria-hidden />
              <span className="text-sm font-medium text-ink-700">
                {isFull ? 'Photo limit reached' : 'Drop images here, or click to browse'}
              </span>
              <span className="text-xs">
                JPEG, PNG, WebP or AVIF · up to {MAX_FILE_MB}MB each · {MAX_PER_UPLOAD} at a time
                {!isFull && ` · ${remaining} slot${remaining === 1 ? '' : 's'} left`}
              </span>
            </>
          )}
        </label>

        {photos.length === 0 ? (
          <p className="text-center text-sm text-ink-500">
            No photos yet. Your storefront, interior and popular products are a good place to start.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => {
              const isCover = shop.media.coverImage === photo.url;
              const busy = pendingUrl === photo.url;

              return (
                <li
                  key={photo.url}
                  className="group relative overflow-hidden rounded-xl border border-ink-200 bg-ink-100"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `${shop.name} photo`}
                    loading="lazy"
                    decoding="async"
                    className="aspect-4/3 w-full object-cover"
                  />

                  {isCover && (
                    <span className="absolute left-2 top-2">
                      <Badge variant="brand">Cover</Badge>
                    </span>
                  )}

                  {busy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Spinner className="size-5 text-brand-600" />
                    </div>
                  )}

                  {/* Always visible on touch, emphasised on hover for pointer users. */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink-900/80 to-transparent p-2">
                    <button
                      type="button"
                      disabled={isCover || busy}
                      onClick={() => setCover(photo.url)}
                      className="rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-ink-700 transition hover:bg-white disabled:opacity-0"
                    >
                      Set as cover
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removePhoto(photo.url)}
                      aria-label="Remove photo"
                      className="rounded-lg bg-white/90 p-1.5 text-rose-600 transition hover:bg-white hover:text-rose-700 disabled:opacity-50"
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// --- Opening timetable -------------------------------------------------------

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];
type DayDraft = { isOpen: boolean; open: string; close: string };

const DEFAULT_HOURS = { open: '10:00', close: '21:00' };

function toDraft(schedule: Record<string, DaySchedule> | undefined): Record<DayKey, DayDraft> {
  return Object.fromEntries(
    DAYS.map(({ key }) => {
      const day = schedule?.[key];
      return [
        key,
        {
          isOpen: Boolean(day) && day!.isOpen !== false,
          open: day?.open ?? DEFAULT_HOURS.open,
          close: day?.close ?? DEFAULT_HOURS.close,
        },
      ];
    }),
  ) as Record<DayKey, DayDraft>;
}

/** Exported so the admin panel can edit opening hours on any shop. */
export function HoursCard({ shop }: { shop: ShopDetail }) {
  const updateShop = useUpdateShop(shop.id);
  const push = useToasts((s) => s.push);

  const schedule = shop.businessHours?.schedule;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<DayKey, DayDraft>>(() => toDraft(schedule));
  const [error, setError] = useState('');

  // JS Sunday=0 → our Monday-first order.
  const todayKey = DAYS[(new Date().getDay() + 6) % 7].key;

  function startEditing() {
    setDraft(toDraft(schedule));
    setError('');
    setEditing(true);
  }

  function setDay(key: DayKey, patch: Partial<DayDraft>) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  function copyMondayToAll() {
    setDraft((d) => Object.fromEntries(DAYS.map(({ key }) => [key, { ...d.monday }])) as Record<DayKey, DayDraft>);
  }

  function save() {
    setError('');

    const incomplete = DAYS.filter(({ key }) => draft[key].isOpen && (!draft[key].open || !draft[key].close));
    if (incomplete.length) {
      setError('Set both an opening and a closing time for every open day.');
      return;
    }

    // Breaks are preserved untouched — they are not editable here yet.
    const payload = Object.fromEntries(
      DAYS.map(({ key }) => {
        const day = draft[key];
        const breaks = schedule?.[key]?.breaks;
        return [
          key,
          day.isOpen
            ? { isOpen: true, open: day.open, close: day.close, ...(breaks?.length ? { breaks } : {}) }
            : { isOpen: false },
        ];
      }),
    );

    updateShop.mutate(
      { businessHours: { timezone: shop.businessHours?.timezone ?? 'Asia/Kolkata', schedule: payload } },
      {
        onSuccess: () => {
          push('Opening hours updated', 'success');
          setEditing(false);
        },
        onError: (err) => setError((err as Error).message),
      },
    );
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Clock size={15} aria-hidden />
          Opening timetable
        </h3>

        <div className="flex items-center gap-2">
          <OpenBadge isOpen={shop.isOpenNow} label={openStateLabel(shop.openState?.reason ?? 'unknown')} />
          {!editing && (
            <button type="button" onClick={startEditing} className="btn-secondary btn-sm">
              Edit hours
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {editing ? (
          <>
            <ul className="space-y-2">
              {DAYS.map(({ key, label }) => {
                const day = draft[key];
                return (
                  <li
                    key={key}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5"
                  >
                    <label className="flex min-w-40 flex-1 items-center gap-2.5 text-sm font-medium text-ink-800">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(e) => setDay(key, { isOpen: e.target.checked })}
                        className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      {label}
                    </label>

                    {day.isOpen ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={day.open}
                          onChange={(e) => setDay(key, { open: e.target.value })}
                          aria-label={`${label} opening time`}
                          className="input w-32 px-3 py-1.5"
                        />
                        <span className="text-ink-400">–</span>
                        <input
                          type="time"
                          value={day.close}
                          onChange={(e) => setDay(key, { close: e.target.value })}
                          aria-label={`${label} closing time`}
                          className="input w-32 px-3 py-1.5"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-rose-600">Closed all day</span>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-xs text-ink-400">
              Times are in {shop.businessHours?.timezone ?? 'Asia/Kolkata'}. A closing time earlier than the opening
              time means you stay open past midnight.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={copyMondayToAll} className="btn-ghost btn-sm">
                Copy Monday to every day
              </button>
              <div className="flex flex-1 justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={updateShop.isPending}
                  className="btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button type="button" onClick={save} disabled={updateShop.isPending} className="btn-primary btn-md">
                  {updateShop.isPending ? 'Saving…' : (
                    <>
                      <Check size={16} aria-hidden />
                      Save hours
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <ul className="divide-y divide-ink-100 text-sm">
            {DAYS.map(({ key, label }) => {
              const day = schedule?.[key];
              const closed = !day || day.isOpen === false;
              const isToday = key === todayKey;

              return (
                <li
                  key={key}
                  className={clsx(
                    'flex items-center justify-between gap-4 px-2 py-2.5',
                    isToday && 'rounded-lg bg-brand-50 font-medium',
                  )}
                >
                  <span className={isToday ? 'text-brand-800' : 'text-ink-600'}>
                    {label}
                    {isToday && <span className="ml-1.5 text-xs text-brand-600">· today</span>}
                  </span>
                  <span className={closed ? 'text-rose-600' : isToday ? 'text-brand-800' : 'text-ink-800'}>
                    {closed ? 'Closed' : `${formatTime(day.open)} – ${formatTime(day.close)}`}
                  </span>
                </li>
              );
            })}
            <li className="pt-3 text-xs text-ink-400">
              Times shown in {shop.businessHours?.timezone ?? 'Asia/Kolkata'} — this is the timetable customers see on
              your public page.
            </li>
          </ul>
        )}
      </div>
    </section>
  );
}

function sanitizePhone(value: string) {
  let cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.slice(2);
  cleaned = cleaned.replace(/^0+/, '');
  return cleaned.replace(/\D/g, '').slice(0, 10);
}

function CreateShopModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { data: categories = [] } = useCategories();
  const createShop = useCreateShop();
  const push = useToasts((s) => s.push);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    phone: '',
    address: '',
    landmark: '',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '',
    lat: '23.2599',
    lng: '77.4126',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const errors: Record<string, string> = {};

    if (form.name.trim().length < 2) {
      errors.name = 'Shop name must be at least 2 characters';
    }
    if (!form.category) {
      errors.category = 'Please choose a category';
    }
    const cleanNumber = form.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
      errors.phone = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9';
    }
    if (form.address.trim().length < 5) {
      errors.address = 'Street address must be at least 5 characters';
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      errors.pincode = 'Pincode must be exactly 6 digits (e.g. 462001)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please resolve the errors highlighted below.');
      return;
    }

    createShop.mutate(
      {
        ...form,
        phone: cleanNumber,
        pincode: form.pincode.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        landmark: form.landmark || undefined,
        description: form.description || undefined,
        tags: [],
        items: [],
        offers: [],
      },
      {
        onSuccess: (createdShop) => {
          push('Shop created — please add your price list now.', 'success');
          onClose();
          onCreated?.(createdShop.id);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.details?.length) {
            setFieldErrors(err.fieldErrors);
            const messages = err.details.map((d) => d.message).join(' • ');
            setError(`Validation error: ${messages}`);
          } else {
            setError((err as Error).message);
          }
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="List your shop" size="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="shop-name" className="label">
            Shop name
          </label>
          <input
            id="shop-name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            className={clsx('input', fieldErrors.name && 'border-rose-400 focus:border-rose-500')}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="shop-category" className="label">
              Category
            </label>
            <select
              id="shop-category"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              required
              className={clsx('input', fieldErrors.category && 'border-rose-400 focus:border-rose-500')}
            >
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.category} />
          </div>
          <div>
            <label htmlFor="shop-phone" className="label">
              Contact number
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-ink-300 bg-ink-50 px-3 text-sm font-medium text-ink-500">
                +91
              </span>
              <input
                id="shop-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set('phone', sanitizePhone(e.target.value))}
                placeholder="9876543210"
                required
                className={clsx('input rounded-l-none', fieldErrors.phone && 'border-rose-400 focus:border-rose-500')}
              />
            </div>
            <p className="mt-1 text-xs text-ink-400">10-digit mobile number (starting with 6-9)</p>
            <FieldError message={fieldErrors.phone} />
          </div>
        </div>

        <div>
          <label htmlFor="shop-description" className="label">
            Description <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <textarea
            id="shop-description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What do you offer? What makes your shop worth visiting?"
            className={clsx('input resize-none', fieldErrors.description && 'border-rose-400 focus:border-rose-500')}
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div>
          <label htmlFor="shop-address" className="label">
            Street address
          </label>
          <input
            id="shop-address"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            required
            className={clsx('input', fieldErrors.address && 'border-rose-400 focus:border-rose-500')}
          />
          <FieldError message={fieldErrors.address} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="shop-landmark" className="label">
              Landmark
            </label>
            <input
              id="shop-landmark"
              value={form.landmark}
              onChange={(e) => set('landmark', e.target.value)}
              className={clsx('input', fieldErrors.landmark && 'border-rose-400 focus:border-rose-500')}
            />
            <FieldError message={fieldErrors.landmark} />
          </div>
          <div>
            <label htmlFor="shop-city" className="label">
              City
            </label>
            <input
              id="shop-city"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              required
              className={clsx('input', fieldErrors.city && 'border-rose-400 focus:border-rose-500')}
            />
            <FieldError message={fieldErrors.city} />
          </div>
          <div>
            <label htmlFor="shop-pincode" className="label">
              Pincode
            </label>
            <input
              id="shop-pincode"
              inputMode="numeric"
              value={form.pincode}
              onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="462001"
              required
              className={clsx('input', fieldErrors.pincode && 'border-rose-400 focus:border-rose-500')}
            />
            <FieldError message={fieldErrors.pincode} />
          </div>
        </div>

        <fieldset className="rounded-xl border border-ink-200 p-4">
          <legend className="px-1 text-sm font-medium text-ink-700">Map location</legend>
          <p className="mb-3 text-xs text-ink-500">
            Click anywhere on the map or drag the pin to set your exact shop location.
          </p>

          {/* Interactive map */}
          <LocationPicker
            lat={parseFloat(form.lat) || 23.2599}
            lng={parseFloat(form.lng) || 77.4126}
            onChange={(lat, lng) => {
              set('lat', String(lat));
              set('lng', String(lng));
            }}
          />

          {/* Coordinate inputs — update automatically, still manually editable */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="shop-lat" className="label">Latitude</label>
              <input
                id="shop-lat"
                value={form.lat}
                onChange={(e) => set('lat', e.target.value)}
                required
                className="input font-mono text-sm"
                placeholder="23.2599"
              />
              <FieldError message={fieldErrors.lat} />
            </div>
            <div>
              <label htmlFor="shop-lng" className="label">Longitude</label>
              <input
                id="shop-lng"
                value={form.lng}
                onChange={(e) => set('lng', e.target.value)}
                required
                className="input font-mono text-sm"
                placeholder="77.4126"
              />
              <FieldError message={fieldErrors.lng} />
            </div>
          </div>
        </fieldset>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary btn-md flex-1">
            Cancel
          </button>
          <button type="submit" disabled={createShop.isPending} className="btn-primary btn-md flex-1">
            {createShop.isPending ? 'Creating…' : 'Create shop'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
