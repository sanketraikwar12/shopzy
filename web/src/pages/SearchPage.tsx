import clsx from 'clsx';
import { Filter, MapPin, SlidersHorizontal, Store, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShopCard } from '@/components/ShopCard';
import { EmptyState, ErrorState, Modal, Pagination, ShopCardSkeleton } from '@/components/ui';
import { formatCount, titleCase } from '@/lib/format';
import { useDocumentMeta, useMediaQuery } from '@/lib/hooks';
import { useCategories, useSavedShops, useSearch, useToggleSaved } from '@/lib/queries';
import { useAuth, useLocation, useToasts } from '@/store';
import type { SearchParams, SortKey } from '@/types';

const SORT_OPTIONS: Array<{ value: SortKey; label: string; needsGeo?: boolean }> = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'distance', label: 'Nearest first', needsGeo: true },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
  { value: 'popularity', label: 'Most popular' },
  { value: 'newest', label: 'Recently added' },
];

const FEATURE_FILTERS = [
  { key: 'openNow', label: 'Open now' },
  { key: 'hasOffers', label: 'Has offers' },
  { key: 'hasDelivery', label: 'Delivery' },
  { key: 'hasBooking', label: 'Booking' },
  { key: 'hasParking', label: 'Parking' },
  { key: 'acceptsUPI', label: 'UPI' },
  { key: 'verifiedOnly', label: 'Verified only' },
] as const;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { coords, radius, setRadius } = useLocation();
  const { data: categories = [] } = useCategories();
  const user = useAuth((s) => s.user);
  const { data: saved = [] } = useSavedShops();
  const toggleSaved = useToggleSaved();
  const push = useToasts((s) => s.push);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = (params.get('sort') as SortKey) ?? (coords ? 'distance' : 'relevance');
  const page = Number(params.get('page') ?? 1);
  const minRating = params.get('minRating') ? Number(params.get('minRating')) : undefined;
  const maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined;

  const routerLocation = useRouterLocation();
  const isDealsRoute = routerLocation.pathname === '/deals';

  const activeFeatures = useMemo(
    () =>
      new Set(
        FEATURE_FILTERS.filter(
          (f) => params.get(f.key) === 'true' || (isDealsRoute && f.key === 'hasOffers'),
        ).map((f) => f.key),
      ),
    [params, isDealsRoute],
  );

  const searchParams: SearchParams = {
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(coords ? { lat: coords.lat, lng: coords.lng, radius } : {}),
    ...(minRating ? { minRating } : {}),
    ...(maxPrice ? { maxPrice } : {}),
    ...Object.fromEntries(Array.from(activeFeatures).map((k) => [k, true])),
    sort,
    page,
    limit: 12,
  };

  const { data, isLoading, isError, refetch, isPlaceholderData } = useSearch(searchParams);

  const headline = q ? `"${q}"` : isDealsRoute ? 'Exclusive Local Deals & Offers' : category ? titleCase(category) : 'All shops';
  useDocumentMeta(
    `${headline} in Bhopal — ${data?.meta?.total ?? 0} results | SHOPZY`,
    `Browse ${data?.meta?.total ?? 0} local businesses matching ${headline} in Bhopal with prices, ratings and live opening hours.`,
  );

  const savedIds = new Set(saved.map((s) => s.id));

  /** Writes a param and resets pagination — every filter change starts at page 1. */
  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || value === 'false') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  }

  function onSave(shopId: string) {
    if (!user) {
      push('Sign in to save shops', 'info');
      navigate('/login');
      return;
    }
    toggleSaved.mutate(shopId, {
      onSuccess: (res) => push(res.saved ? 'Saved to your list' : 'Removed from saved', 'success'),
    });
  }

  const activeFilterCount =
    activeFeatures.size + (minRating ? 1 : 0) + (maxPrice ? 1 : 0) + (category ? 1 : 0);

  const filterPanel = (
    <FilterPanel
      categories={categories}
      category={category}
      minRating={minRating}
      maxPrice={maxPrice}
      radius={radius}
      hasGeo={Boolean(coords)}
      activeFeatures={activeFeatures}
      facets={data?.meta?.facets}
      onUpdate={update}
      onRadiusChange={setRadius}
      onClear={() => setParams(q ? new URLSearchParams({ q }) : new URLSearchParams(), { replace: true })}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-slate-100">{headline}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-500 dark:text-slate-400">
          {isLoading ? (
            'Searching…'
          ) : (
            <>
              <span>
                <strong className="text-ink-700 dark:text-slate-200">{formatCount(data?.meta?.total ?? 0)}</strong> shops found
              </span>
              {data?.meta?.tookMs !== undefined && <span className="text-ink-400 dark:text-slate-500">· {data.meta.tookMs} ms</span>}
              {coords && (
                <span className="inline-flex items-center gap-1 text-ink-400 dark:text-slate-500">
                  <MapPin size={12} aria-hidden /> within {radius} km
                </span>
              )}
            </>
          )}
        </p>
      </header>

      <div className="flex gap-6">
        {isDesktop && <aside className="w-64 shrink-0">{filterPanel}</aside>}

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2">
            {!isDesktop && (
              <button type="button" onClick={() => setFiltersOpen(true)} className="btn-secondary btn-sm">
                <SlidersHorizontal size={15} aria-hidden />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort" className="hidden text-sm text-ink-500 dark:text-slate-400 sm:block">
                Sort by
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => update({ sort: e.target.value })}
                className="input w-auto py-2 text-sm"
              >
                {SORT_OPTIONS.filter((o) => !o.needsGeo || coords).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {category && (
                <FilterChip label={titleCase(category)} onRemove={() => update({ category: undefined })} />
              )}
              {minRating && <FilterChip label={`${minRating}★ & above`} onRemove={() => update({ minRating: undefined })} />}
              {maxPrice && <FilterChip label={`Under ₹${maxPrice}`} onRemove={() => update({ maxPrice: undefined })} />}
              {Array.from(activeFeatures).map((key) => (
                <FilterChip
                  key={key}
                  label={FEATURE_FILTERS.find((f) => f.key === key)?.label ?? key}
                  onRemove={() => update({ [key]: undefined })}
                />
              ))}
            </div>
          )}

          {isError ? (
            <ErrorState message="We couldn't load results. Please try again." onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ShopCardSkeleton key={i} />
              ))}
            </div>
          ) : data?.items.length ? (
            <>
              <div className={clsx('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', isPlaceholderData && 'opacity-60')}>
                {data.items.map((shop, i) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    position={(page - 1) * 12 + i}
                    onSave={onSave}
                    isSaved={savedIds.has(shop.id)}
                  />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={data.meta?.totalPages ?? 1}
                onChange={(p) => update({ page: String(p) })}
              />
            </>
          ) : (
            <EmptyState
              icon={<Store className="size-8" />}
              title="No shops matched your search"
              description={
                coords
                  ? `Nothing within ${radius} km. Try widening the radius or removing a filter.`
                  : 'Try a different keyword, or clear some filters.'
              }
              action={
                <button
                  type="button"
                  className="btn-primary btn-md"
                  onClick={() => setParams(new URLSearchParams(), { replace: true })}
                >
                  Clear all filters
                </button>
              }
            />
          )}
        </div>
      </div>

      <Modal open={filtersOpen && !isDesktop} onClose={() => setFiltersOpen(false)} title="Filters">
        {filterPanel}
        <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary btn-md mt-4 w-full">
          Show {formatCount(data?.meta?.total ?? 0)} results
        </button>
      </Modal>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="chip bg-brand-100 text-brand-800">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="hover:text-brand-950">
        <X size={12} />
      </button>
    </span>
  );
}

interface FilterPanelProps {
  categories: Array<{ slug: string; name: string; shopCount: number }>;
  category: string;
  minRating?: number;
  maxPrice?: number;
  radius: number;
  hasGeo: boolean;
  activeFeatures: Set<string>;
  facets?: { categories: Array<{ value: string; count: number }>; ratings: Array<{ value: number; count: number }> };
  onUpdate: (patch: Record<string, string | undefined>) => void;
  onRadiusChange: (radius: number) => void;
  onClear: () => void;
}

function FilterPanel({
  categories,
  category,
  minRating,
  maxPrice,
  radius,
  hasGeo,
  activeFeatures,
  facets,
  onUpdate,
  onRadiusChange,
  onClear,
}: FilterPanelProps) {
  const facetCounts = new Map(facets?.categories.map((c) => [c.value, c.count]));

  return (
    <div className="space-y-6 lg:card lg:p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-slate-100">
          <Filter size={15} aria-hidden />
          Filters
        </h2>
        <button type="button" onClick={onClear} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
          Clear all
        </button>
      </div>

      {hasGeo && (
        <div>
          <label htmlFor="filter-radius" className="label">
            Distance: <span className="font-semibold text-brand-700">{radius} km</span>
          </label>
          <input
            id="filter-radius"
            type="range"
            min={1}
            max={25}
            value={radius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>
      )}

      <fieldset>
        <legend className="label">Category</legend>
        <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
          <FilterRadio
            name="category"
            checked={!category}
            label="All categories"
            onChange={() => onUpdate({ category: undefined })}
          />
          {categories.map((c) => (
            <FilterRadio
              key={c.slug}
              name="category"
              checked={category === c.slug}
              label={c.name}
              count={facetCounts.get(c.slug) ?? c.shopCount}
              onChange={() => onUpdate({ category: c.slug })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Minimum rating</legend>
        <div className="space-y-0.5">
          <FilterRadio name="rating" checked={!minRating} label="Any rating" onChange={() => onUpdate({ minRating: undefined })} />
          {[4, 3, 2].map((r) => (
            <FilterRadio
              key={r}
              name="rating"
              checked={minRating === r}
              label={`${r}★ & above`}
              count={facets?.ratings.find((f) => f.value === r)?.count}
              onChange={() => onUpdate({ minRating: String(r) })}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="filter-price" className="label">
          Max price: <span className="font-semibold text-brand-700">{maxPrice ? `₹${maxPrice}` : 'Any'}</span>
        </label>
        <input
          id="filter-price"
          type="range"
          min={0}
          max={5000}
          step={100}
          value={maxPrice ?? 5000}
          onChange={(e) => {
            const v = Number(e.target.value);
            onUpdate({ maxPrice: v >= 5000 ? undefined : String(v) });
          }}
          className="w-full accent-brand-600"
        />
      </div>

      <fieldset>
        <legend className="label">Features</legend>
        <div className="space-y-0.5">
          {FEATURE_FILTERS.map((f) => (
            <label key={f.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-50 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={activeFeatures.has(f.key)}
                onChange={(e) => onUpdate({ [f.key]: e.target.checked ? 'true' : undefined })}
                className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-ink-700 dark:text-slate-300">{f.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function FilterRadio({
  name,
  checked,
  label,
  count,
  onChange,
}: {
  name: string;
  checked: boolean;
  label: string;
  count?: number;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-50 dark:hover:bg-slate-800">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 border-ink-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="flex-1 text-sm text-ink-700 dark:text-slate-300">{label}</span>
      {count !== undefined && <span className="text-xs text-ink-400 dark:text-slate-500">{count}</span>}
    </label>
  );
}
