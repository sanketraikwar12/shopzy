import clsx from 'clsx';
import { ArrowRight, ChevronDown, Loader2, MapPin, Navigation, Search, Sparkles, Store, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClickOutside, useDebounced } from '@/lib/hooks';
import { useSuggestions, useTrending } from '@/lib/queries';
import { useLocation } from '@/store';

interface Props {
  initialValue?: string;
  size?: 'md' | 'lg';
  variant?: 'default' | 'hero';
  autoFocus?: boolean;
  onSubmit?: (query: string) => void;
}

export function SearchBar({ initialValue = '', size = 'md', variant = 'default', autoFocus, onSubmit }: Props) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { label: locationLabel, status: locationStatus, detect: detectLocation, radius, setRadius } = useLocation();

  const debounced = useDebounced(value, 250);
  const { data: suggestions = [], isFetching } = useSuggestions(debounced);
  const { data: trending = [] } = useTrending();

  const containerRef = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const locationMenuRef = useClickOutside<HTMLDivElement>(() => setLocationOpen(false));

  useEffect(() => setValue(initialValue), [initialValue]);
  useEffect(() => setActiveIndex(-1), [debounced]);

  const showTrending = value.trim().length < 2;
  const options = showTrending
    ? trending.slice(0, 6).map((t) => ({ type: 'trend' as const, label: t.query, sublabel: `${t.count} searches`, slug: undefined }))
    : suggestions;

  function go(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    inputRef.current?.blur();
    if (onSubmit) onSubmit(trimmed);
    else navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return go(value);
    // A shop suggestion jumps straight to its page; everything else runs a search.
    if ('slug' in option && option.slug) {
      setOpen(false);
      navigate(`/shop/${option.slug}`);
      return;
    }
    go(option.label);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0) choose(activeIndex);
      else go(value);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {variant === 'hero' ? (
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go(value);
          }}
          className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl sm:rounded-full bg-white p-1.5 shadow-2xl ring-1 ring-black/5"
        >
          <div className="relative flex-1 flex items-center min-w-0">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 text-ink-400 shrink-0"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={value}
              autoFocus={autoFocus}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search for salons, restaurants, groceries, services…"
              aria-label="Search shops and services"
              aria-expanded={open}
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              role="combobox"
              className="w-full bg-transparent pl-11 pr-8 py-3 text-sm sm:text-base text-ink-800 placeholder:text-ink-400 focus:outline-none"
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-2.5 rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Vertical divider */}
          <div className="hidden sm:block h-7 w-[1px] bg-ink-200 mx-1 shrink-0" />

          {/* Location picker */}
          <div ref={locationMenuRef} className="relative shrink-0 px-2 py-1 sm:py-0 border-t sm:border-t-0 border-ink-100">
            <button
              type="button"
              onClick={() => setLocationOpen((o) => !o)}
              className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1.5 rounded-full bg-ink-50 sm:bg-transparent px-3 py-2 text-xs sm:text-sm font-medium text-ink-700 hover:bg-ink-100 transition"
              aria-haspopup="dialog"
              aria-expanded={locationOpen}
            >
              <MapPin size={15} className="shrink-0 text-brand-600" aria-hidden />
              <span className="truncate max-w-[110px]">{locationLabel || 'Bhopal, MP'}</span>
              <ChevronDown size={14} className="shrink-0 text-ink-400" aria-hidden />
            </button>

            {locationOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-ink-200 bg-white p-4 shadow-xl text-left">
                <p className="mb-3 text-xs text-ink-500">
                  Sharing your location sorts results by real distance and enables nearby price comparison.
                </p>
                <button
                  type="button"
                  onClick={() => void detectLocation()}
                  disabled={locationStatus === 'locating'}
                  className="btn-primary btn-sm w-full"
                >
                  {locationStatus === 'locating' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Navigation size={14} />
                  )}
                  {locationStatus === 'locating' ? 'Detecting…' : 'Use my current location'}
                </button>
                {locationStatus === 'denied' && (
                  <p className="mt-2 text-xs text-amber-700">
                    Location access was blocked. Showing results for Bhopal city centre.
                  </p>
                )}
                <label className="label mt-4" htmlFor="hero-radius-range">
                  Search radius: <span className="font-semibold text-brand-700">{radius} km</span>
                </label>
                <input
                  id="hero-radius-range"
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
              </div>
            )}
          </div>

          {/* Search CTA */}
          <button
            type="submit"
            className="mt-1 sm:mt-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0066f5] hover:bg-blue-600 active:bg-blue-700 px-6 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-md transition shrink-0"
          >
            {isFetching ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : null}
            <span>Search</span>
            <ArrowRight size={15} aria-hidden />
          </button>
        </form>
      ) : (
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go(value);
          }}
        >
          <div className="relative">
            <Search
              size={size === 'lg' ? 20 : 17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={value}
              autoFocus={autoFocus}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search salons, restaurants, groceries, services…"
              aria-label="Search shops and services"
              aria-expanded={open}
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              role="combobox"
              className={clsx(
                'w-full rounded-2xl border border-ink-300 bg-white pl-11 pr-24 text-ink-800 shadow-sm',
                'placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none',
                size === 'lg' ? 'py-4 text-base' : 'py-2.5 text-sm',
              )}
            />

            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-[4.5rem] top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="submit"
              className={clsx(
                'absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary',
                size === 'lg' ? 'btn-md' : 'btn-sm',
              )}
            >
              {isFetching ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Search size={15} aria-hidden />}
              <span className="sr-only sm:not-sr-only">Search</span>
            </button>
          </div>
        </form>
      )}

      {open && options.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-ink-200 bg-white py-1.5 shadow-xl"
        >
          {showTrending && (
            <li className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Trending in Bhopal
            </li>
          )}
          {options.map((option, index) => (
            <li key={`${option.type}-${option.label}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
                className={clsx(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left',
                  index === activeIndex ? 'bg-brand-50' : 'hover:bg-ink-50',
                )}
              >
                <span className="shrink-0 text-ink-400">
                  {option.type === 'shop' ? <Store size={16} /> : option.type === 'trend' ? <Sparkles size={16} /> : <Search size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium capitalize text-ink-800">{option.label}</span>
                  <span className="block truncate text-xs capitalize text-ink-500">{option.sublabel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Compact control that detects or displays the user's location. */
export function LocationPicker({ className, pill, dark }: { className?: string; pill?: boolean; dark?: boolean }) {
  const { label, status, detect, radius, setRadius } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  const displayCity = label ? (label.includes(',') ? label.split(',')[0].trim() : label) : 'Bhopal';

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex items-center gap-1.5 transition font-medium',
          dark
            ? 'rounded-full border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 hover:text-white text-xs px-3 py-1.5 shadow-sm'
            : pill
              ? 'rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 px-3.5 py-1.5 text-sm'
              : 'rounded-xl border border-ink-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-700/80 px-3.5 py-1.5 text-sm',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MapPin size={14} className={dark ? 'shrink-0 text-sky-400' : 'shrink-0 text-blue-600 dark:text-blue-400'} aria-hidden />
        <span className="truncate max-w-[7.5rem]">{displayCity}</span>
        <ChevronDown size={12} className="shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && (
        <div
          className={clsx(
            'absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl p-4 shadow-2xl text-left',
            dark
              ? 'border border-slate-700/80 bg-[#061933]/98 backdrop-blur-md text-white'
              : 'border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-800',
          )}
        >
          <p className={clsx('mb-3 text-xs', dark ? 'text-slate-300' : 'text-ink-500 dark:text-slate-400')}>
            Sharing your location sorts results by real distance and enables nearby price comparison.
          </p>

          <button
            type="button"
            onClick={() => void detect()}
            disabled={status === 'locating'}
            className="btn-primary btn-sm w-full"
          >
            {status === 'locating' ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            {status === 'locating' ? 'Detecting…' : 'Use my current location'}
          </button>

          {status === 'denied' && (
            <p className="mt-2 text-xs text-amber-400">
              Location access was blocked. Showing results for Bhopal city centre.
            </p>
          )}

          <label className={clsx('label mt-4', dark ? 'text-slate-200' : 'dark:text-slate-200')} htmlFor="radius-range">
            Search radius: <span className="font-semibold text-sky-400">{radius} km</span>
          </label>
          <input
            id="radius-range"
            type="range"
            min={1}
            max={25}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-sky-500"
          />
        </div>
      )}
    </div>
  );
}
