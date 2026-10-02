import clsx from 'clsx';
import {
  Bookmark,
  ChevronRight,
  Clock,
  Compass,
  Filter,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Star,
  Ticket,
  Trees,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BHOPAL_TOURIST_DESTINATIONS,
  TOURIST_CATEGORIES,
  type TouristCategory,
  type TouristPlace,
} from '@/data/bhopalTourismData';
import { useDocumentMeta } from '@/lib/hooks';

/* ── Category pill mapping (short labels for the horizontal bar) ──────── */
const CATEGORY_PILLS: { id: string; label: string; match?: TouristCategory }[] = [
  { id: 'all', label: 'All' },
  { id: 'heritage', label: 'Heritage', match: 'Heritage & History' },
  { id: 'nature', label: 'Nature', match: 'Lakes & Nature' },
  { id: 'wildlife', label: 'Wildlife', match: 'Wildlife' },
  { id: 'museums', label: 'Museums', match: 'Museums & Culture' },
  { id: 'religious', label: 'Religious', match: 'Religious & Spiritual' },
  { id: 'family', label: 'Family', match: 'Family & Adventure' },
  { id: 'waterparks', label: 'Water Parks', match: 'Water Parks' },
  { id: 'shopping', label: 'Shopping', match: 'Shopping & Local Life' },
  { id: 'daytrips', label: 'Day Trips', match: 'Day Trips' },
  { id: 'hidden', label: 'Hidden Gems', match: 'Hidden Gems' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'az', label: 'A-Z' },
  { value: 'rated', label: 'Highest Rated' },
  { value: 'popular', label: 'Popular' },
  { value: 'daytrips', label: 'Day Trips' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

/* ── Helpers ─────────────────────────────────────────────────────────── */

function isOpenNow(place: TouristPlace): boolean {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  if (place.closedDays.includes(day)) return false;
  const [oh, om] = place.openingTime.split(':').map(Number);
  const [ch, cm] = place.closingTime.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins <= ch * 60 + cm;
}

function matchesSearch(place: TouristPlace, query: string): boolean {
  const q = query.toLowerCase();
  return (
    place.name.toLowerCase().includes(q) ||
    (place.alternateName?.toLowerCase().includes(q) ?? false) ||
    (place.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false) ||
    place.shortDescription.toLowerCase().includes(q) ||
    place.description.toLowerCase().includes(q) ||
    place.category.toLowerCase().includes(q) ||
    place.categories.some((c) => c.toLowerCase().includes(q)) ||
    place.tags.some((t) => t.toLowerCase().includes(q)) ||
    place.location.toLowerCase().includes(q) ||
    place.nearbyPlaces.some((n) => n.toLowerCase().includes(q))
  );
}

/* ── Featured IDs ────────────────────────────────────────────────────── */
const FEATURED_IDS = new Set([
  'upper-lake',
  'van-vihar-national-park',
  'taj-ul-masjid',
  'bhimbetka-rock-shelters',
  'bhojpur-shiva-temple',
  'sanchi-stupa',
  'tribal-museum-bhopal',
  'gohar-mahal',
]);

/* ════════════════════════════════════════════════════════════════════════
 *  MAIN PAGE
 * ══════════════════════════════════════════════════════════════════════ */

export function TouristPlacesPage() {
  useDocumentMeta(
    'Tourist Places & Hidden Gems in Bhopal | Shopzy',
    'Discover heritage, lakes, wildlife, culture, local markets, and hidden gems of Bhopal — all in one place.',
  );

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortValue>('recommended');
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterFamilyFriendly, setFilterFamilyFriendly] = useState(false);
  const [filterDayTrip, setFilterDayTrip] = useState(false);
  const [filterFreeEntry, setFilterFreeEntry] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());

  const toggleSave = (id: string) => {
    setSavedPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Filtering ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let results = [...BHOPAL_TOURIST_DESTINATIONS];

    // Category pill filter
    if (activeCategory !== 'all') {
      const pill = CATEGORY_PILLS.find((p) => p.id === activeCategory);
      if (pill?.match) {
        results = results.filter((p) => p.categories.includes(pill.match!));
      }
    }

    // Text search
    if (search.trim()) {
      results = results.filter((p) => matchesSearch(p, search.trim()));
    }

    // Toggle filters
    if (filterOpenNow) results = results.filter(isOpenNow);
    if (filterFamilyFriendly) results = results.filter((p) => p.isFamilyFriendly);
    if (filterDayTrip) results = results.filter((p) => p.isDayTrip);
    if (filterFreeEntry) results = results.filter((p) => p.priceLabel === 'Free');

    // Sorting
    switch (sortBy) {
      case 'nearest':
        results.sort((a, b) => a.distanceFromBhopal - b.distanceFromBhopal);
        break;
      case 'az':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rated':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        results.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'daytrips':
        results.sort((a, b) => (b.isDayTrip ? 1 : 0) - (a.isDayTrip ? 1 : 0));
        break;
      default: // recommended — featured first, then by rating
        results.sort((a, b) => {
          const fa = a.isFeatured ? 1 : 0;
          const fb = b.isFeatured ? 1 : 0;
          if (fa !== fb) return fb - fa;
          return b.rating - a.rating;
        });
    }

    return results;
  }, [search, activeCategory, sortBy, filterOpenNow, filterFamilyFriendly, filterDayTrip, filterFreeEntry]);

  const featuredPlaces = BHOPAL_TOURIST_DESTINATIONS.filter((p) => FEATURED_IDS.has(p.id));
  const hiddenGems = BHOPAL_TOURIST_DESTINATIONS.filter((p) => p.isHiddenGem);

  const anyFilterActive = search || activeCategory !== 'all' || filterOpenNow || filterFamilyFriendly || filterDayTrip || filterFreeEntry;

  const resetAllFilters = () => {
    setSearch('');
    setActiveCategory('all');
    setFilterOpenNow(false);
    setFilterFamilyFriendly(false);
    setFilterDayTrip(false);
    setFilterFreeEntry(false);
    setSortBy('recommended');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-16">
      {/* ═══ HERO SECTION ═══ */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-[#03152d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(2,132,199,0.12),transparent_50%)] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(245,158,11,0.06),transparent_60%)] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-sky-400 font-medium">Tourist Places</span>
          </nav>

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-950/60 px-3 py-1 text-[11px] font-semibold text-sky-300 uppercase tracking-wider mb-4">
            <Compass size={13} className="text-sky-400" />
            Explore Bhopal
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl">
            Bhopal Tourist Places &amp; <span className="text-sky-400">Hidden Gems</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Discover heritage, lakes, wildlife, culture, local markets and hidden gems — all in one place.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tourist places, lakes, museums, temples..."
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/80 pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="shrink-0 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-4 py-3 text-sm font-semibold transition active:scale-95 flex items-center gap-1.5"
              >
                <Search size={15} />
                <span className="hidden sm:inline">Search</span>
              </button>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-4 py-3 text-sm font-medium transition flex items-center gap-1.5"
                title="Sort by nearest"
                onClick={() => setSortBy('nearest')}
              >
                <Navigation size={15} className="text-sky-400" />
                <span className="hidden sm:inline">Near Me</span>
              </button>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-950/50 hover:bg-amber-900/50 text-amber-200 px-4 py-3 text-sm font-medium transition flex items-center gap-1.5"
                title="Open AI Citizen Assistant"
                onClick={() => {
                  // Dispatch custom event to open the global ShopzyAssistant
                  window.dispatchEvent(new CustomEvent('shopzy:open-assistant'));
                }}
              >
                <Sparkles size={15} className="text-amber-400" />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 px-3 py-1.5">
              <MapPin size={13} className="text-sky-400" />
              <strong>{BHOPAL_TOURIST_DESTINATIONS.length}</strong> Destinations
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 px-3 py-1.5">
              <Trees size={13} className="text-emerald-400" />
              <strong>{hiddenGems.length}</strong> Hidden Gems
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 px-3 py-1.5">
              <Star size={13} className="text-amber-400" />
              <strong>{featuredPlaces.length}</strong> Featured
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

        {/* ── Category Pills ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORY_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveCategory(pill.id)}
              className={clsx(
                'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition select-none border',
                activeCategory === pill.id
                  ? 'bg-[#03152d] text-white border-[#03152d] dark:bg-sky-600 dark:border-sky-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  showFilters
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                <Filter size={13} />
                Filters
              </button>

              {/* Toggle chips (always visible) */}
              <ToggleChip label="Open Now" active={filterOpenNow} onClick={() => setFilterOpenNow((v) => !v)} />
              <ToggleChip label="Family Friendly" active={filterFamilyFriendly} onClick={() => setFilterFamilyFriendly((v) => !v)} />
              <ToggleChip label="Day Trip" active={filterDayTrip} onClick={() => setFilterDayTrip((v) => !v)} />
              <ToggleChip label="Free Entry" active={filterFreeEntry} onClick={() => setFilterFreeEntry((v) => !v)} />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs text-slate-500 font-medium">Sort:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortValue)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expanded Filters Panel */}
          {showFilters && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-500 font-medium">Categories:</span>
              {TOURIST_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    const pill = CATEGORY_PILLS.find((p) => p.match === cat);
                    if (pill) setActiveCategory(pill.id);
                  }}
                  className={clsx(
                    'rounded-full px-3 py-1 border transition',
                    CATEGORY_PILLS.find((p) => p.match === cat)?.id === activeCategory
                      ? 'bg-[#03152d] dark:bg-sky-600 text-white border-transparent'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Results Info ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <p>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filtered.length}</strong> place{filtered.length === 1 ? '' : 's'} found
          </p>
          {anyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* ═══ FEATURED BHOPAL (only when no filters active) ═══ */}
        {!anyFilterActive && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Star size={18} className="text-amber-500" />
                Featured Bhopal
              </h2>
              <span className="text-xs text-slate-400">{featuredPlaces.length} places</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredPlaces.map((place) => (
                <FeaturedCard key={place.id} place={place} />
              ))}
            </div>
          </section>
        )}

        {/* ═══ HIDDEN GEMS (only when no filters active) ═══ */}
        {!anyFilterActive && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trees size={18} className="text-emerald-500" />
                Hidden Gems of Bhopal
              </h2>
              <span className="text-xs text-slate-400">{hiddenGems.length} gems</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hiddenGems.map((place) => (
                <HiddenGemCard key={place.id} place={place} />
              ))}
            </div>
          </section>
        )}

        {/* ═══ ALL DESTINATIONS GRID ═══ */}
        <section>
          {!anyFilterActive && (
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">
              All Destinations
            </h2>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center">
              <Compass size={36} className="mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-semibold">No places match your search</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Try "lake", "museum", "temple", "wildlife", "market", or "bhimbetka".
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 rounded-full bg-[#03152d] dark:bg-sky-600 text-white px-5 py-2 text-xs font-semibold hover:opacity-90 transition"
              >
                Show all destinations
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  saved={savedPlaces.has(place.id)}
                  onToggleSave={() => toggleSave(place.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 *  SUB-COMPONENTS
 * ══════════════════════════════════════════════════════════════════════ */

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold border transition select-none',
        active
          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
      )}
    >
      {label}
    </button>
  );
}

/* ── Featured Card (compact, horizontal-ish) ─────────────────────────── */
function FeaturedCard({ place }: { place: TouristPlace }) {
  return (
    <Link
      to={`/tourist-places/${place.slug}`}
      className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all"
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={place.heroImage}
          alt={place.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        <span className="absolute top-2.5 left-2.5 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          Featured
        </span>
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="text-sm font-bold text-white drop-shadow-sm line-clamp-1">{place.name}</h3>
          <p className="text-[10px] text-slate-300 mt-0.5">{place.location}</p>
        </div>
      </div>
    </Link>
  );
}

/* ── Hidden Gem Card ─────────────────────────────────────────────────── */
function HiddenGemCard({ place }: { place: TouristPlace }) {
  return (
    <Link
      to={`/tourist-places/${place.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs hover:shadow-md transition-all"
    >
      <div className="relative shrink-0 h-20 w-20 overflow-hidden rounded-lg">
        <img
          src={place.heroImage}
          alt={place.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute top-1 left-1 rounded-full bg-emerald-600/90 px-1.5 py-px text-[8px] font-bold text-white">
          Gem
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
          {place.name}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
          {place.shortDescription}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-0.5">
            <MapPin size={10} /> {place.location}
          </span>
          {place.entryFee === 'Free' || place.priceLabel === 'Free' ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free Entry</span>
          ) : null}
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-400 group-hover:text-sky-500 transition-colors" />
    </Link>
  );
}

/* ── Main Place Card ─────────────────────────────────────────────────── */
function PlaceCard({
  place,
  saved,
  onToggleSave,
}: {
  place: TouristPlace;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const openNow = isOpenNow(place);

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md transition-all">
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-800">
        <img
          src={place.heroImage}
          alt={place.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        {/* Top-Left: Category Badge */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className={clsx(
            'rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm',
            place.isHiddenGem ? 'bg-emerald-600/90' : 'bg-sky-600/90',
          )}>
            {place.category}
          </span>
        </div>

        {/* Top-Right: Rating + Save */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {place.rating > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-slate-950/75 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-400/20">
              <Star size={10} className="fill-amber-300" />
              {place.rating}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onToggleSave(); }}
            className={clsx(
              'grid size-7 place-items-center rounded-full border transition',
              saved
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-950/60 border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-800',
            )}
            title={saved ? 'Unsave' : 'Save'}
            aria-label={saved ? `Unsave ${place.name}` : `Save ${place.name}`}
          >
            <Bookmark size={13} className={saved ? 'fill-white' : ''} />
          </button>
        </div>

        {/* Bottom: Name overlay */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5">
          <h3 className="text-base font-bold text-white drop-shadow-sm leading-snug line-clamp-1">
            {place.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {place.shortDescription}
        </p>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-950/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <MapPin size={12} className="text-sky-500 shrink-0" />
            <span className="truncate">{place.location}, Bhopal</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Clock size={12} className={clsx('shrink-0', openNow ? 'text-emerald-500' : 'text-slate-400')} />
            <span className={clsx('truncate', openNow ? 'text-emerald-700 dark:text-emerald-400 font-medium' : '')}>
              {openNow ? 'Open Now' : `${place.openingTime} – ${place.closingTime}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Ticket size={12} className="text-amber-500 shrink-0" />
            <span className="truncate">{place.priceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Navigation size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{place.distanceText}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {place.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Card Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
          <Link
            to={`/tourist-places/${place.slug}`}
            className="flex-1 rounded-xl bg-[#03152d] dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white py-2 text-xs font-semibold text-center transition flex items-center justify-center gap-1 shadow-xs"
          >
            View Details
            <ChevronRight size={13} />
          </Link>
          <a
            href={place.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Get Directions"
            aria-label={`Get directions to ${place.name}`}
          >
            <Navigation size={14} className="text-sky-500" />
          </a>
        </div>
      </div>
    </article>
  );
}
