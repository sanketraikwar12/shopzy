import clsx from 'clsx';
import { ArrowDown, BadgeCheck, MapPin, Navigation, Phone, ScaleIcon, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, LoadingBlock, OpenBadge, Stars } from '@/components/ui';
import { track } from '@/lib/api';
import { directionsUrl, formatDistance, formatINR, openStateLabel } from '@/lib/format';
import { useDebounced, useDocumentMeta } from '@/lib/hooks';
import { usePriceComparison } from '@/lib/queries';
import { useLocation } from '@/store';

const EXAMPLES = ['Haircut (Men)', 'Cappuccino', 'Monthly Membership', 'Aashirvaad Atta 5kg', 'Mobile Screen Replacement'];

export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const { coords, radius } = useLocation();

  const initial = params.get('item') ?? '';
  const [input, setInput] = useState(initial);
  const debounced = useDebounced(input, 400);

  const { data, isLoading, isFetching } = usePriceComparison(debounced, coords, Math.max(radius, 10));

  useDocumentMeta(
    debounced ? `Compare "${debounced}" prices in Bhopal | SHOPZY` : 'Compare local prices in Bhopal | SHOPZY',
    'Compare what nearby shops actually charge for the same item or service. Real listed prices, sorted cheapest first.',
  );

  const rows = data?.rows ?? [];
  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-600">
          <ScaleIcon className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">Compare prices near you</h1>
        <p className="mx-auto mt-2 max-w-xl text-ink-500">
          Type an item or service and see exactly what every shop around you charges for it.
        </p>
      </header>

      <div className="mx-auto mt-6 max-w-2xl">
        <label htmlFor="compare-input" className="sr-only">
          Item or service to compare
        </label>
        <input
          id="compare-input"
          type="search"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('item', e.target.value);
            else next.delete('item');
            setParams(next, { replace: true });
          }}
          placeholder="e.g. Haircut, Cappuccino, Monthly Membership…"
          className="input py-3.5 text-base"
          autoFocus
        />

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-ink-400">Try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setInput(example);
                setParams(new URLSearchParams({ item: example }), { replace: true });
              }}
              className="rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-600 transition hover:bg-brand-100 hover:text-brand-700"
            >
              {example}
            </button>
          ))}
        </div>

        {!coords && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-amber-700">
            <MapPin size={12} aria-hidden />
            Share your location to sort by distance and see how far each shop is.
          </p>
        )}
      </div>

      {/* --- Results ----------------------------------------------------- */}
      <div className="mt-8">
        {debounced.trim().length < 2 ? (
          <EmptyState
            icon={<ScaleIcon className="size-8" />}
            title="Start typing to compare"
            description="Enter at least 2 characters. We search every published price list nearby."
          />
        ) : isLoading ? (
          <LoadingBlock label="Comparing prices…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ScaleIcon className="size-8" />}
            title={`No shop nearby lists "${debounced}"`}
            description="Try a shorter or more common term — for example 'haircut' instead of 'gents haircut deluxe'."
            action={
              <Link to="/search" className="btn-primary btn-md">
                Browse all shops
              </Link>
            }
          />
        ) : (
          <>
            {stats && stats.count > 1 && (
              <div className="mb-5 grid gap-3 sm:grid-cols-4">
                <StatTile label="Cheapest" value={formatINR(stats.min)} accent="emerald" />
                <StatTile label="Average" value={formatINR(stats.avg)} />
                <StatTile label="Most expensive" value={formatINR(stats.max)} accent="rose" />
                <StatTile
                  label="You could save"
                  value={formatINR(stats.max - stats.min)}
                  accent="brand"
                  icon={<TrendingDown size={14} aria-hidden />}
                />
              </div>
            )}

            <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-500">
              <ArrowDown size={14} aria-hidden />
              {stats?.count} shop{stats?.count === 1 ? '' : 's'} listed, cheapest first
              {isFetching && <span className="text-ink-400">· updating…</span>}
            </p>

            <ol className="space-y-3">
              {rows.map((row, index) => (
                <li
                  key={`${row.shop.id}-${row.item.name}`}
                  className={clsx(
                    'card flex flex-col gap-4 p-5 sm:flex-row sm:items-center',
                    row.isCheapest && 'ring-2 ring-emerald-400',
                  )}
                >
                  <span
                    className={clsx(
                      'grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold',
                      row.isCheapest ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500',
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/shop/${row.shop.slug}`}
                      className="flex items-center gap-1.5 font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {row.shop.name}
                      {row.shop.isVerified && <BadgeCheck size={15} className="text-brand-600" aria-label="Verified" />}
                    </Link>

                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {row.item.name}
                      {row.item.unit && <span className="text-ink-400"> · {row.item.unit}</span>}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs">
                      {row.shop.ratings.total > 0 && <Stars value={row.shop.ratings.average} size={12} showValue />}
                      <OpenBadge isOpen={row.shop.isOpenNow} label={openStateLabel(row.shop.openState.reason)} />
                      {row.shop.distanceKm !== undefined && (
                        <span className="inline-flex items-center gap-1 text-ink-500">
                          <MapPin size={11} aria-hidden />
                          {formatDistance(row.shop.distanceKm)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <div className="text-right">
                      <p className={clsx('text-2xl font-bold', row.isCheapest ? 'text-emerald-600' : 'text-ink-900')}>
                        {formatINR(row.item.price)}
                      </p>
                      {row.isCheapest ? (
                        <span className="chip bg-emerald-100 text-emerald-800">Best price</span>
                      ) : row.savingsVsMax > 0 ? (
                        <p className="text-xs text-ink-400">
                          +{formatINR(row.item.price - (stats?.min ?? 0))} vs cheapest
                        </p>
                      ) : null}
                    </div>

                    <div className="ml-auto flex gap-1.5 sm:ml-0">
                      <a
                        href={`tel:+91${row.shop.phone}`}
                        onClick={() => track(row.shop.id, 'call_click')}
                        className="btn-secondary btn-sm"
                        aria-label={`Call ${row.shop.name}`}
                      >
                        <Phone size={14} aria-hidden />
                      </a>
                      <a
                        href={directionsUrl(row.shop.location.coordinates, row.shop.name)}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={() => track(row.shop.id, 'direction_click')}
                        className="btn-secondary btn-sm"
                        aria-label={`Directions to ${row.shop.name}`}
                      >
                        <Navigation size={14} aria-hidden />
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'rose' | 'brand';
  icon?: React.ReactNode;
}) {
  const accents = {
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    brand: 'text-brand-600',
  };

  return (
    <div className="card px-4 py-3">
      <p className="flex items-center gap-1 text-xs text-ink-500">
        {icon}
        {label}
      </p>
      <p className={clsx('mt-1 text-xl font-bold', accent ? accents[accent] : 'text-ink-900')}>{value}</p>
    </div>
  );
}
