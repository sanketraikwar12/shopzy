import clsx from 'clsx';
import {
  BadgeCheck,
  Bookmark,
  Building2,
  Clock,
  Globe,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  Store,
  Tag,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShopCard } from '@/components/ShopCard';
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  OpenBadge,
  Pagination,
  Stars,
} from '@/components/ui';
import { track } from '@/lib/api';
import {
  directionsUrl,
  discountLabel,
  formatDistance,
  formatINR,
  formatTime,
  initials,
  openStateLabel,
  relativeTime,
  safeUrl,
  titleCase,
  whatsappUrl,
} from '@/lib/format';
import { useDocumentMeta, useStructuredData } from '@/lib/hooks';
import {
  useClaimShop,
  useCreateReview,
  useDeleteReview,
  useMarkHelpful,
  useReplyToReview,
  useReviews,
  useSavedShops,
  useShop,
  useSimilarShops,
  useToggleSaved,
} from '@/lib/queries';
import { useAuth, useLocation, useToasts } from '@/store';
import type { PriceItem, ShopDetail } from '@/types';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEMO_COVERS: Record<string, string> = {
  'sagar-gaire-fast-food': '/shops/sagar_gaire.jpg',
  'cafe-kabuli': '/shops/cafe_kabuli.jpg',
  'lifecare-pharmacy-diagnostics': '/shops/lifecare.jpg',
  'mobilehub-electronics': '/shops/mobilehub.jpg',
};

const CATEGORY_COVERS: Record<string, string> = {
  restaurants: '/categories/cat_food.jpg',
  salons: '/categories/cat_salon.jpg',
  grocery: '/categories/cat_grocery.jpg',
  gyms: '/categories/cat_gym.jpg',
  electronics: '/categories/cat_tech.jpg',
  healthcare: '/categories/cat_health.jpg',
  'home-services': '/categories/cat_repair.jpg',
  fashion: '/categories/cat_fashion.jpg',
};

export function ShopDetailPage() {
  const { slug = '' } = useParams();
  const { coords } = useLocation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const push = useToasts((s) => s.push);

  const { data: shop, isLoading, isError, refetch } = useShop(slug, coords);
  const { data: similar = [] } = useSimilarShops(slug);
  const { data: saved = [] } = useSavedShops();
  const toggleSaved = useToggleSaved();

  const [tab, setTab] = useState<'prices' | 'reviews' | 'about'>('prices');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  useDocumentMeta(
    shop ? `${shop.name} — ${titleCase(shop.category)} in ${shop.location.city} | SHOPZY` : 'Loading… | SHOPZY',
    shop?.description ?? undefined,
  );

  // Schema.org LocalBusiness — drives the rich result in Google.
  useStructuredData(
    shop
      ? {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: shop.name,
          description: shop.description,
          telephone: `+91${shop.contact.phone}`,
          url: window.location.href,
          address: {
            '@type': 'PostalAddress',
            streetAddress: shop.location.address,
            addressLocality: shop.location.city,
            addressRegion: shop.location.state,
            postalCode: shop.location.pincode,
            addressCountry: 'IN',
          },
          ...(shop.location.coordinates
            ? {
                geo: {
                  '@type': 'GeoCoordinates',
                  latitude: shop.location.coordinates[1],
                  longitude: shop.location.coordinates[0],
                },
              }
            : {}),
          ...(shop.ratings.total > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: shop.ratings.average,
                  reviewCount: shop.ratings.total,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
          makesOffer: shop.pricing.items.slice(0, 20).map((item) => ({
            '@type': 'Offer',
            name: item.name,
            price: item.price,
            priceCurrency: shop.pricing.currency,
          })),
        }
      : null,
  );

  if (isLoading) return <LoadingBlock label="Loading shop…" />;
  if (isError || !shop) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState message="We couldn't find that shop." onRetry={() => void refetch()} />
      </div>
    );
  }

  const isSaved = saved.some((s) => s.id === shop.id);
  const isOwner = user?.id === shop.ownerId;
  const distance = formatDistance(shop.distanceKm);

  const coverSrc =
    shop.media.coverImage ||
    DEMO_COVERS[shop.slug] ||
    (shop.slug.includes('cafe-kabuli')
      ? '/shops/cafe_kabuli.jpg'
      : shop.slug.includes('sagar-gaire')
        ? '/shops/sagar_gaire.jpg'
        : shop.slug.includes('lifecare')
          ? '/shops/lifecare.jpg'
          : shop.slug.includes('mobilehub')
            ? '/shops/mobilehub.jpg'
            : CATEGORY_COVERS[shop.category] || '/categories/cat_food.jpg');

  function onSave() {
    if (!user) {
      push('Sign in to save shops', 'info');
      navigate('/login');
      return;
    }
    toggleSaved.mutate(shop!.id, {
      onSuccess: (res) => push(res.saved ? 'Saved to your list' : 'Removed from saved', 'success'),
    });
  }

  function handleClaimClick() {
    if (!user) {
      push('Please sign in to claim this business', 'info');
      navigate(`/login?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setClaimOpen(true);
  }

  async function onShare() {
    const url = window.location.href;
    track(shop!.id, 'share');
    if (navigator.share) {
      try {
        await navigator.share({ title: shop!.name, url });
        return;
      } catch {
        // User dismissed the sheet — fall through to clipboard.
      }
    }
    await navigator.clipboard.writeText(url);
    push('Link copied to clipboard', 'success');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-ink-500 dark:text-slate-400">
        <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link to={`/search?category=${shop.category}`} className="capitalize hover:text-brand-600 dark:hover:text-brand-400">
          {titleCase(shop.category)}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate font-medium text-ink-700 dark:text-slate-200">{shop.name}</span>
      </nav>

      {/* --- Hero ------------------------------------------------------- */}
      <header className="card overflow-hidden">
        <div className="relative h-40 bg-stone-800 dark:bg-stone-900 border-b border-stone-700 sm:h-56 overflow-hidden">
          <img src={coverSrc} alt={shop.name} className="size-full object-cover" />
          <div className="absolute right-3 top-3 flex gap-2">
            <button type="button" onClick={onShare} className="btn bg-white/90 dark:bg-slate-800/90 p-2 text-ink-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700" aria-label="Share">
              <Share2 size={16} />
            </button>
            <button
              type="button"
              onClick={onSave}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Remove from saved' : 'Save shop'}
              className="btn bg-white/90 dark:bg-slate-800/90 p-2 text-ink-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
            >
              <Bookmark size={16} className={clsx(isSaved && 'fill-brand-600 text-brand-600 dark:fill-brand-400 dark:text-brand-400')} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink-900 dark:text-slate-100">
                {shop.name}
                {shop.isVerified && <BadgeCheck className="size-5 text-brand-600 dark:text-brand-400" aria-label="Verified business" />}
              </h1>

              <p className="mt-1 text-sm capitalize text-ink-500 dark:text-slate-400">
                {shop.subCategory?.replace(/-/g, ' ') ?? shop.category.replace(/-/g, ' ')}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {shop.ratings.total > 0 ? (
                  <span className="flex items-center gap-2">
                    <Stars value={shop.ratings.average} size={16} showValue />
                    <button
                      type="button"
                      onClick={() => setTab('reviews')}
                      className="text-sm text-ink-500 dark:text-slate-400 underline-offset-2 hover:underline"
                    >
                      {shop.ratings.total} reviews
                    </button>
                  </span>
                ) : (
                  <span className="text-sm text-ink-400 dark:text-slate-500">No reviews yet</span>
                )}
                <OpenBadge isOpen={shop.isOpenNow} label={openStateLabel(shop.openState.reason)} />
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-sm text-ink-600 dark:text-slate-300">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-400 dark:text-slate-500" aria-hidden />
                <span>
                  {shop.location.address}
                  {shop.location.landmark && `, ${shop.location.landmark}`}, {shop.location.city} —{' '}
                  {shop.location.pincode}
                  {distance && <span className="ml-1 font-medium text-brand-700 dark:text-brand-400">· {distance} away</span>}
                </span>
              </p>
            </div>

            {isOwner ? (
              <Link to="/owner" className="btn-secondary btn-sm">
                Manage shop
              </Link>
            ) : !shop.isVerified ? (
              <button
                type="button"
                onClick={handleClaimClick}
                className="btn-secondary btn-sm flex items-center gap-1.5 text-ink-700 hover:text-ink-900 border-ink-300"
              >
                <Building2 size={14} aria-hidden />
                Claim business
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={`tel:+91${shop.contact.phone}`}
              onClick={() => track(shop.id, 'call_click')}
              className="btn-primary btn-md flex-1 sm:flex-none"
            >
              <Phone size={16} aria-hidden />
              Call now
            </a>
            <a
              href={directionsUrl(shop.location.coordinates, shop.name)}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => track(shop.id, 'direction_click')}
              className="btn-secondary btn-md flex-1 sm:flex-none"
            >
              <Navigation size={16} aria-hidden />
              Directions
            </a>
            {shop.contact.whatsapp && (
              <a
                href={whatsappUrl(shop.contact.whatsapp, `Hi ${shop.name}, I found you on SHOPZY.`)}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-secondary btn-md"
              >
                <MessageCircle size={16} aria-hidden />
                WhatsApp
              </a>
            )}
            {safeUrl(shop.contact.website) && (
              <a
                href={safeUrl(shop.contact.website)!}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => track(shop.id, 'website_click')}
                className="btn-secondary btn-md"
              >
                <Globe size={16} aria-hidden />
                Website
              </a>
            )}
          </div>
        </div>
      </header>

      {/* --- Offers ------------------------------------------------------ */}
      {shop.offers.length > 0 && (
        <section className="mt-5" aria-label="Current offers">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shop.offers.map((offer) => (
              <div key={offer.id} className="flex gap-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50 p-4">
                <Tag className="size-5 shrink-0 text-rose-500" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold text-rose-900">{offer.title}</p>
                  {offer.description && <p className="mt-0.5 text-sm text-rose-700">{offer.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="danger">{discountLabel(offer.discountType, offer.discountValue)}</Badge>
                    {offer.code && (
                      <code className="rounded border border-rose-300 bg-white px-2 py-0.5 text-xs font-bold tracking-wide text-rose-700">
                        {offer.code}
                      </code>
                    )}
                    {offer.minOrderValue && (
                      <span className="text-xs text-rose-600">Min {formatINR(offer.minOrderValue)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- Tabs -------------------------------------------------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div role="tablist" className="mb-4 flex gap-1 border-b border-ink-200">
            {(
              [
                ['prices', `Prices (${shop.pricing.items.length})`],
                ['reviews', `Reviews (${shop.ratings.total})`],
                ['about', 'About & hours'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={clsx(
                  '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === key
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'prices' && <PriceList shop={shop} />}
          {tab === 'reviews' && (
            <ReviewsTab shop={shop} isOwner={isOwner} onWrite={() => setReviewOpen(true)} />
          )}
          {tab === 'about' && <AboutTab shop={shop} />}
        </div>

        <aside className="space-y-4">
          {!shop.isVerified && !isOwner && (
            <div className="card border border-amber-200/80 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-500" aria-hidden />
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">Own or manage this business?</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
                    Claim your business listing to update pricing, add photos, and engage directly with local shoppers.
                  </p>
                  <button
                    type="button"
                    onClick={handleClaimClick}
                    className="mt-3 btn-secondary btn-sm text-xs font-medium border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Claim this business
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Clock size={15} aria-hidden />
              Opening hours
            </h2>
            <HoursTable shop={shop} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Amenities</h2>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(shop.features).filter(([, v]) => v).length === 0 ? (
                <p className="text-sm text-ink-400">Not specified</p>
              ) : (
                Object.entries(shop.features)
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <Badge key={key} variant="neutral">
                      {key.replace(/^(has|is|accepts)/, '').replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  ))
              )}
            </div>
          </div>

          {shop.location.coordinates && (
            <a
              href={directionsUrl(shop.location.coordinates, shop.name)}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => track(shop.id, 'direction_click')}
              className="card flex items-center gap-3 p-5 transition-shadow hover:shadow-md"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <MapPin size={18} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">Get directions</span>
                <span className="block truncate text-xs text-ink-500">
                  {shop.location.coordinates[1].toFixed(4)}, {shop.location.coordinates[0].toFixed(4)}
                </span>
              </span>
            </a>
          )}
        </aside>
      </div>

      {/* --- Similar shops ------------------------------------------------ */}
      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-ink-900">Similar shops nearby</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.slice(0, 4).map((s) => (
              <ShopCard key={s.id} shop={s} compact />
            ))}
          </div>
        </section>
      )}

      <WriteReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} shop={shop} />
      <ClaimShopModal open={claimOpen} onClose={() => setClaimOpen(false)} shop={shop} />
    </div>
  );
}

// --- Price list ---------------------------------------------------------------

function PriceList({ shop }: { shop: ShopDetail }) {
  const [query, setQuery] = useState('');

  if (shop.pricing.items.length === 0) {
    return <EmptyState icon={<Store className="size-8" />} title="No price list yet" description="This shop hasn't published its prices." />;
  }

  const filtered = shop.pricing.items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));

  // Group by the shop's own item categories ("Hair Services", "Staples", …).
  const groups = filtered.reduce<Record<string, PriceItem[]>>((acc, item) => {
    const key = item.category ?? 'Other';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search this price list…"
        aria-label="Search price list"
        className="input"
      />

      {Object.keys(groups).length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500">No items match "{query}".</p>
      ) : (
        Object.entries(groups).map(([group, items]) => (
          <section key={group} className="card overflow-hidden">
            <h3 className="border-b border-ink-100 dark:border-slate-800 bg-ink-50 dark:bg-slate-850 px-5 py-3 text-sm font-semibold text-ink-800 dark:text-slate-200">{group}</h3>
            <ul className="divide-y divide-ink-100 dark:divide-slate-800">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-800 dark:text-slate-100">
                      {item.name}
                      {!item.isAvailable && <span className="ml-2 text-xs text-rose-600">Unavailable</span>}
                    </p>
                    {item.description && <p className="mt-0.5 text-sm text-ink-500 dark:text-slate-400">{item.description}</p>}
                    {item.variants.length > 0 && (
                      <p className="mt-1 text-xs text-ink-500 dark:text-slate-400">
                        {item.variants.map((v) => `${v.name} ${formatINR(v.price)}`).join(' · ')}
                      </p>
                    )}
                    <Link
                      to={`/compare?item=${encodeURIComponent(item.name)}`}
                      className="mt-1.5 inline-block text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      Compare this price nearby →
                    </Link>
                  </div>

                  <div className="shrink-0 text-right flex flex-col items-end">
                    <p className="font-bold text-ink-900 dark:text-slate-100">{formatINR(item.price)}</p>
                    {item.comparePrice && item.comparePrice > item.price && (
                      <p className="text-xs">
                        <span className="text-ink-400 line-through">{formatINR(item.comparePrice)}</span>
                        <span className="ml-1 font-semibold text-emerald-600">{item.discountPercent}% off</span>
                      </p>
                    )}
                    {item.unit && <p className="mt-0.5 text-xs text-ink-400 dark:text-slate-500">{item.unit}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

// --- Reviews ------------------------------------------------------------------

function ReviewsTab({ shop, isOwner, onWrite }: { shop: ShopDetail; isOwner: boolean; onWrite: () => void }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const { data, isLoading } = useReviews(shop.id, page, sort);
  const user = useAuth((s) => s.user);
  const push = useToasts((s) => s.push);
  const navigate = useNavigate();

  const markHelpful = useMarkHelpful(shop.id);
  const deleteReview = useDeleteReview(shop.id, shop.slug);
  const replyMutation = useReplyToReview(shop.id);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const total = shop.ratings.total;

  return (
    <div className="space-y-5">
      <div className="card flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
        <div className="text-center sm:w-40">
          <p className="text-4xl font-bold text-ink-900">{shop.ratings.average.toFixed(1)}</p>
          <Stars value={shop.ratings.average} size={16} />
          <p className="mt-1 text-xs text-ink-500">{total} reviews</p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = shop.ratings.breakdown[String(star)] ?? 0;
            const pct = total ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-ink-500">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-ink-500">{count}</span>
              </div>
            );
          })}
        </div>

        {!isOwner && (
          <button
            type="button"
            onClick={() => {
              if (!user) {
                push('Sign in to write a review', 'info');
                navigate('/login');
                return;
              }
              onWrite();
            }}
            className="btn-primary btn-md shrink-0"
          >
            Write a review
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{data?.meta?.total ?? 0} reviews</p>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          aria-label="Sort reviews"
          className="input w-auto py-1.5 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="helpful">Most helpful</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading reviews…" />
      ) : data?.items.length ? (
        <>
          <ul className="space-y-3">
            {data.items.map((review) => (
              <li key={review.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {initials(review.author.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-800">{review.author.name}</span>
                      {review.isVerifiedPurchase && <Badge variant="success">Verified visit</Badge>}
                      <span className="text-xs text-ink-400">{relativeTime(review.createdAt)}</span>
                    </div>

                    <div className="mt-1.5">
                      <Stars value={review.rating} size={13} />
                    </div>

                    {review.title && <p className="mt-2 font-semibold text-ink-800">{review.title}</p>}
                    {review.comment && <p className="mt-1 text-sm leading-relaxed text-ink-600">{review.comment}</p>}

                    {review.reply && (
                      <div className="mt-3 rounded-xl border-l-2 border-brand-400 bg-brand-50 px-4 py-3">
                        <p className="text-xs font-semibold text-brand-800">Response from the owner</p>
                        <p className="mt-1 text-sm text-brand-900">{review.reply.comment}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) return push('Sign in to vote', 'info');
                          markHelpful.mutate(review.id);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-brand-600"
                      >
                        <ThumbsUp size={13} aria-hidden />
                        Helpful ({review.helpfulCount})
                      </button>

                      {review.isMine && (
                        <button
                          type="button"
                          onClick={() =>
                            deleteReview.mutate(review.id, { onSuccess: () => push('Review deleted', 'success') })
                          }
                          className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={13} aria-hidden />
                          Delete
                        </button>
                      )}

                      {isOwner && !review.reply && (
                        <button
                          type="button"
                          onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          Reply
                        </button>
                      )}
                    </div>

                    {replyingTo === review.id && (
                      <form
                        className="mt-3 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!replyText.trim()) return;
                          replyMutation.mutate(
                            { reviewId: review.id, comment: replyText },
                            {
                              onSuccess: () => {
                                setReplyingTo(null);
                                setReplyText('');
                                push('Reply posted', 'success');
                              },
                            },
                          );
                        }}
                      >
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a public reply…"
                          className="input"
                          maxLength={1000}
                        />
                        <button type="submit" className="btn-primary btn-sm shrink-0">
                          Post
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={data.meta?.totalPages ?? 1} onChange={setPage} />
        </>
      ) : (
        <EmptyState title="No reviews yet" description="Be the first to share your experience with this shop." />
      )}
    </div>
  );
}

function WriteReviewModal({ open, onClose, shop }: { open: boolean; onClose: () => void; shop: ShopDetail }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const createReview = useCreateReview(shop.id, shop.slug);
  const push = useToasts((s) => s.push);

  return (
    <Modal open={open} onClose={onClose} title={`Review ${shop.name}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          createReview.mutate(
            { rating, title: title || undefined, comment: comment || undefined },
            {
              onSuccess: () => {
                push('Thanks! Your review is live.', 'success');
                setTitle('');
                setComment('');
                onClose();
              },
              onError: (err) => push((err as Error).message, 'error'),
            },
          );
        }}
      >
        <fieldset>
          <legend className="label">Your rating</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                aria-pressed={rating === star}
                className="p-1"
              >
                <Stars value={rating >= star ? 5 : 0} size={24} />
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-500">{rating} out of 5</p>
        </fieldset>

        <div>
          <label htmlFor="review-title" className="label">
            Title <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="Sum up your experience"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="review-comment" className="label">
            Your review <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="What was good? What could be better? Were the listed prices accurate?"
            className="input resize-none"
          />
          <p className="mt-1 text-right text-xs text-ink-400">{comment.length}/2000</p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-md flex-1">
            Cancel
          </button>
          <button type="submit" disabled={createReview.isPending} className="btn-primary btn-md flex-1">
            {createReview.isPending ? 'Posting…' : 'Post review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- About / hours ------------------------------------------------------------

function AboutTab({ shop }: { shop: ShopDetail }) {
  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink-900">About</h2>
        <p className="text-sm leading-relaxed text-ink-600">{shop.description ?? 'No description provided.'}</p>

        {shop.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {shop.tags.map((tag) => (
              <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`}>
                <Badge variant="brand" className="capitalize hover:bg-brand-200">
                  {tag.replace(/-/g, ' ')}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Contact</h2>
        <dl className="space-y-2 text-sm">
          <ContactRow label="Phone" value={`+91 ${shop.contact.phone}`} href={`tel:+91${shop.contact.phone}`} />
          {shop.contact.alternatePhone && (
            <ContactRow label="Alternate" value={`+91 ${shop.contact.alternatePhone}`} href={`tel:+91${shop.contact.alternatePhone}`} />
          )}
          {shop.contact.email && <ContactRow label="Email" value={shop.contact.email} href={`mailto:${shop.contact.email}`} />}
          {safeUrl(shop.contact.website) && (
            <ContactRow label="Website" value={shop.contact.website!} href={safeUrl(shop.contact.website)!} />
          )}
        </dl>
      </section>
    </div>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0">
        <a href={href} className="truncate text-brand-600 hover:text-brand-700" target="_blank" rel="noreferrer noopener">
          {value}
        </a>
      </dd>
    </div>
  );
}

function HoursTable({ shop }: { shop: ShopDetail }) {
  const today = DAY_ORDER[(new Date().getDay() + 6) % 7]; // JS Sunday=0 → our Monday-first order

  return (
    <ul className="space-y-1.5 text-sm">
      {DAY_ORDER.map((day) => {
        const schedule = shop.businessHours?.schedule?.[day];
        const closed = !schedule || schedule.isOpen === false;
        const isToday = day === today;

        return (
          <li
            key={day}
            className={clsx('flex items-center justify-between rounded-lg px-2 py-1', isToday && 'bg-brand-50 font-medium')}
          >
            <span className={clsx('capitalize', isToday ? 'text-brand-800' : 'text-ink-600')}>
              {day.slice(0, 3)}
              {isToday && <span className="ml-1 text-xs text-brand-600">· today</span>}
            </span>
            <span className={closed ? 'text-rose-600' : isToday ? 'text-brand-800' : 'text-ink-700'}>
              {closed ? 'Closed' : `${formatTime(schedule.open)} – ${formatTime(schedule.close)}`}
            </span>
          </li>
        );
      })}
      {shop.businessHours?.timezone && (
        <li className="pt-2 text-xs text-ink-400">Times shown in {shop.businessHours.timezone}</li>
      )}
    </ul>
  );
}

function ClaimShopModal({ open, onClose, shop }: { open: boolean; onClose: () => void; shop: ShopDetail }) {
  const claimShop = useClaimShop(shop.id, shop.slug);
  const push = useToasts((s) => s.push);

  return (
    <Modal open={open} onClose={onClose} title={`Claim ${shop.name}`}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-600">
          Are you the business owner or authorized manager of <strong className="text-ink-900">{shop.name}</strong> located at{' '}
          <em>{shop.location.address}, {shop.location.city}</em>?
        </p>
        <p className="rounded-xl border border-ink-200 bg-ink-50 p-3 text-xs leading-relaxed text-ink-600 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
          Submitting a claim queues your business for review. Once verified by our local operations team, you will receive full ownership access to update catalogues, post offers, and reply to customer reviews.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={claimShop.isPending}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={claimShop.isPending}
            onClick={() => {
              claimShop.mutate(undefined, {
                onSuccess: (res) => {
                  push(res.message, 'success');
                  onClose();
                },
                onError: (err) => {
                  push((err as Error).message, 'error');
                },
              });
            }}
            className="btn-primary btn-sm"
          >
            {claimShop.isPending ? 'Submitting…' : 'Submit Claim Request'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
