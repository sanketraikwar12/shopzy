import clsx from 'clsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Sparkles,
  Star,
  Ticket,
  Utensils,
  X,
  Building2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getRelatedTouristPlaces,
  getTouristPlaceBySlug,
  type TouristPlace,
} from '@/data/bhopalTourismData';
import { useDocumentMeta } from '@/lib/hooks';
import { useToasts } from '@/store';

// Fix Leaflet marker icons in Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function isOpenNow(place: TouristPlace): boolean {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  if (place.closedDays.includes(day)) return false;
  const [oh, om] = place.openingTime.split(':').map(Number);
  const [ch, cm] = place.closingTime.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins <= ch * 60 + cm;
}

export function TouristDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const pushToast = useToasts((s) => s.push);

  const place = slug ? getTouristPlaceBySlug(slug) : undefined;
  const [isSaved, setIsSaved] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Initialize saved state from localStorage
  useEffect(() => {
    if (!place) return;
    try {
      const savedList = JSON.parse(localStorage.getItem('shopzy_saved_tourism') || '[]');
      setIsSaved(savedList.includes(place.id));
    } catch {
      setIsSaved(false);
    }
  }, [place]);

  const toggleSave = () => {
    if (!place) return;
    try {
      const savedList: string[] = JSON.parse(
        localStorage.getItem('shopzy_saved_tourism') || '[]',
      );
      let updated: string[];
      if (savedList.includes(place.id)) {
        updated = savedList.filter((id) => id !== place.id);
        setIsSaved(false);
        pushToast(`Removed ${place.name} from saved destinations`, 'info');
      } else {
        updated = [...savedList, place.id];
        setIsSaved(true);
        pushToast(`Saved ${place.name} to your travel list!`, 'success');
      }
      localStorage.setItem('shopzy_saved_tourism', JSON.stringify(updated));
    } catch {
      pushToast('Unable to update saved list', 'error');
    }
  };

  const handleShare = async () => {
    if (!place) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${place.name} — Tourist Destination in Bhopal | Shopzy`,
          text: place.shortDescription,
          url,
        });
        return;
      } catch {
        // User cancelled share dialog
      }
    }
    await navigator.clipboard.writeText(url);
    pushToast('Link copied to clipboard!', 'success');
  };

  const handleAskAssistant = (promptText?: string) => {
    const defaultPrompt = promptText || `Tell me about ${place?.name} in Bhopal. What are the best timings, ticket details, and nearby food spots?`;
    window.dispatchEvent(
      new CustomEvent('shopzy:open-assistant', {
        detail: { prompt: defaultPrompt },
      }),
    );
  };

  useDocumentMeta(
    place ? `${place.name} | Bhopal Tourist Places | Shopzy` : 'Tourist Place Not Found | Shopzy',
    place ? place.shortDescription : 'Explore Bhopal tourism attractions on Shopzy.',
  );

  if (!place) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Compass size={48} className="mx-auto text-slate-400 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Destination Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The tourist place you are looking for might have been moved or does not exist.
        </p>
        <Link
          to="/tourist-places"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#03152d] dark:bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Tourist Places
        </Link>
      </div>
    );
  }

  const openNow = isOpenNow(place);
  const relatedPlaces = getRelatedTouristPlaces(place.id, 3);
  const allImages = Array.from(new Set([place.heroImage, ...(place.gallery || [])]));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-20">
      {/* ── Breadcrumb Navigation ──────────────────────────────────── */}
      <div className="bg-[#03152d] border-b border-slate-800 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white transition">
              Home
            </Link>
            <span className="text-slate-500">/</span>
            <Link to="/tourist-places" className="hover:text-white transition">
              Tourist Places
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-sky-400 font-medium truncate max-w-[200px] sm:max-w-md">
              {place.name}
            </span>
          </nav>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition font-medium"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* ── FULL-WIDTH HERO SECTION ─────────────────────────────────── */}
      <section className="relative w-full overflow-hidden bg-[#03152d] text-white">
        <div className="relative h-[340px] sm:h-[420px] lg:h-[480px] w-full">
          <img
            src={place.heroImage}
            alt={place.name}
            className="h-full w-full object-cover object-center"
          />
          {/* Subtle gradient overlays for tactile readability without purple/cyan halos */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#03152d] via-[#03152d]/60 to-transparent" />
          <div className="absolute inset-0 bg-black/25 pointer-events-none" />

          {/* Badges on Top */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-wrap items-center gap-2 z-10">
            <span className="rounded-full bg-sky-600/90 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-xs">
              {place.category}
            </span>
            {place.isHiddenGem && (
              <span className="rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-xs">
                Hidden Gem
              </span>
            )}
            {place.isFeatured && (
              <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-xs flex items-center gap-1">
                <Star size={12} className="fill-white" />
                Featured
              </span>
            )}
          </div>

          {/* Hero Content Bottom Overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-xs text-amber-300 font-semibold bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    <Star size={12} className="fill-amber-300 text-amber-300" />
                    {place.rating > 0 ? place.rating : '4.5'}
                    {place.reviewCount > 0 && (
                      <span className="text-amber-200/80 font-normal">
                        ({place.reviewCount.toLocaleString()} reviews)
                      </span>
                    )}
                  </span>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border',
                      openNow
                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900/80 border-slate-700 text-slate-300',
                    )}
                  >
                    <Clock size={11} />
                    {openNow ? 'Open Now' : 'Closed'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight">
                  {place.name}
                </h1>

                {place.alternateName && (
                  <p className="mt-1 text-base sm:text-lg font-medium text-sky-300 drop-shadow-sm">
                    {place.alternateName}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-200">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} className="text-sky-400" />
                    {place.location}, Bhopal
                  </span>
                  <span>•</span>
                  <span>{place.distanceText}</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-400">{place.priceLabel}</span>
                </div>
              </div>

              {/* Action Buttons: [Get Directions] [Save] [Share] */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href={place.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 text-sm font-semibold transition active:scale-95 flex items-center gap-2 shadow-sm"
                >
                  <Navigation size={16} />
                  <span>Get Directions</span>
                </a>

                <button
                  type="button"
                  onClick={toggleSave}
                  className={clsx(
                    'rounded-xl border px-4 py-2.5 text-sm font-semibold transition active:scale-95 flex items-center gap-2',
                    isSaved
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-white',
                  )}
                >
                  <Bookmark size={16} className={isSaved ? 'fill-amber-400 text-amber-400' : ''} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-white p-2.5 transition active:scale-95"
                  title="Share destination"
                  aria-label="Share destination"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Details (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* ═══ ABOUT SECTION ═══ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Info size={19} className="text-sky-500" />
              About {place.name}
            </h2>

            <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-slate-200 leading-relaxed mb-4">
              {place.shortDescription}
            </p>

            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
              <p>{place.description}</p>
            </div>

            {/* Tags list */}
            {place.tags && place.tags.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 mr-1">Tags:</span>
                {place.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ═══ HIGHLIGHTS SECTION ═══ */}
          {place.highlights && place.highlights.length > 0 && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Sparkles size={19} className="text-amber-500" />
                Key Highlights
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 text-sm text-slate-700 dark:text-slate-300">
                {place.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ═══ THINGS TO DO SECTION ═══ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Compass size={19} className="text-sky-500" />
              Things To Do &amp; Activities
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Activities
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {place.activities.map((act, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {place.facilities && place.facilities.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Available Facilities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {place.facilities.map((fac, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 px-2.5 py-1 text-xs font-medium text-sky-800 dark:text-sky-300"
                      >
                        {fac}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ═══ PHOTO GALLERY (REAL IMAGES) ═══ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass size={19} className="text-sky-500" />
                Photo Gallery
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {allImages.length} real photos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPhoto(src)}
                  className="group relative aspect-4/3 overflow-hidden rounded-xl bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <img
                    src={src}
                    alt={`${place.name} view ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/60 px-2.5 py-1 rounded-full">
                      View Full
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ═══ ON THE MAP (INTERACTIVE MAP) ═══ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin size={19} className="text-sky-500" />
                On the Map
              </h2>
              <a
                href={place.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Located at {place.address}. Coordinates: {place.latitude.toFixed(4)}° N,{' '}
              {place.longitude.toFixed(4)}° E.
            </p>

            <InteractiveLeafletMap
              lat={place.latitude}
              lng={place.longitude}
              title={place.name}
              address={place.address}
              directionsUrl={place.directionsUrl}
            />
          </section>

          {/* ═══ NEARBY ON SHOPZY (Hotels, Resorts, Restaurants, Local Shops) ═══ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Utensils size={19} className="text-amber-500" />
                  Nearby on Shopzy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Resorts, lakeside restaurants, cafes &amp; local businesses near {place.name}
                </p>
              </div>
              <Link
                to={`/search?q=${encodeURIComponent(place.location)}`}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View all nearby shops</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {place.nearbyBusinesses && place.nearbyBusinesses.length > 0 ? (
                place.nearbyBusinesses.map((b, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 hover:border-sky-300 dark:hover:border-sky-700 bg-slate-50 dark:bg-slate-950/60 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {b.name}
                        </h4>
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0',
                            b.type === 'Resort' || b.type === 'Hotel'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
                          )}
                        >
                          {b.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {b.highlight}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {b.distance}
                      </span>
                      {b.priceLabel && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {b.priceLabel}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <Link
                        to={`/search?q=${encodeURIComponent(b.shopzySearchQuery || b.name)}`}
                        className="flex-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white py-1.5 text-center text-xs font-semibold transition"
                      >
                        Explore on Shopzy
                      </Link>
                      {b.phone && (
                        <a
                          href={`tel:${b.phone}`}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                          title={`Call ${b.phone}`}
                          aria-label={`Call ${b.name}`}
                        >
                          <Phone size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 py-4 text-center text-xs text-slate-500">
                  Local business listings in this sector are being verified on Shopzy.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Quick Info & AI Assistant Sticky Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* ═══ QUICK INFORMATION CARD ═══ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Info size={16} className="text-sky-500" />
              Quick Information
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <MapPin size={16} className="text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    Location
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                    {place.address}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    Timings
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                    {place.openingHours}
                  </span>
                  {place.closedDays && place.closedDays.length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] block mt-0.5">
                      Closed on {place.closedDays.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <Ticket size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    Entry Fee
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                    {place.entryFee}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <Calendar size={16} className="text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    Best Time To Visit
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                    {place.bestTimeToVisit}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                <Navigation size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    Distance &amp; Reach
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                    {place.distanceText}
                  </span>
                </div>
              </div>
            </div>

            {place.website && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <span>Official Tourism Website</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </section>

          {/* ═══ AI CITIZEN ASSISTANT CARD ═══ */}
          <section className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#03152d] to-[#07244a] text-white p-5 shadow-md">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="grid size-9 place-items-center rounded-xl bg-amber-400 text-[#03152d] font-bold">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold">AI Citizen Assistant</h3>
                <p className="text-[11px] text-amber-200">Ask about {place.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Planning to visit? Ask Shopzy AI Citizen Assistant about local timings, budget, nearby
              dhaba food, and directions in Hindi or English!
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  handleAskAssistant(
                    `What are the best food spots and restaurants near ${place.name}?`,
                  )
                }
                className="w-full text-left rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition"
              >
                🍽️ Best food spots near {place.name}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAskAssistant(
                    `How do I reach ${place.name} and what are the ticket costs?`,
                  )
                }
                className="w-full text-left rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition"
              >
                🎟️ Ticket fees &amp; how to reach
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAskAssistant(
                    `Is ${place.name} good for families and what activities can we do?`,
                  )
                }
                className="w-full text-left rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition"
              >
                👨‍👩‍👧 Family activities at {place.name}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAskAssistant()}
              className="mt-4 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-[#03152d] py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles size={14} />
              <span>Ask Shopzy Assistant</span>
            </button>
          </section>

          {/* ═══ RELATED TOURIST PLACES ═══ */}
          {relatedPlaces.length > 0 && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-sky-500" />
                Nearby Attractions
              </h3>
              <div className="space-y-3">
                {relatedPlaces.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/tourist-places/${rel.slug}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group"
                  >
                    <img
                      src={rel.heroImage}
                      alt={rel.name}
                      className="size-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-500 truncate transition-colors">
                        {rel.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {rel.category} • {rel.distanceText}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── PHOTO LIGHTBOX MODAL ────────────────────────────────────── */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition"
            aria-label="Close photo preview"
          >
            <X size={20} />
          </button>
          <img
            src={selectedPhoto}
            alt="Full size view"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 *  INTERACTIVE LEAFLET MAP COMPONENT
 * ══════════════════════════════════════════════════════════════════════ */

interface MapProps {
  lat: number;
  lng: number;
  title: string;
  address: string;
  directionsUrl: string;
}

function InteractiveLeafletMap({ lat, lng, title, address, directionsUrl }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    marker
      .bindPopup(
        `<div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
          <strong style="color: #03152d; font-size: 14px;">${title}</strong><br/>
          <span style="color: #64748b; font-size: 11px;">${address}</span><br/>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-weight: 600; text-decoration: underline; margin-top: 6px; display: inline-block;">Get Directions →</a>
        </div>`,
      )
      .openPopup();

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, title, address, directionsUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs z-0"
      aria-label={`Interactive map showing ${title}`}
    />
  );
}
