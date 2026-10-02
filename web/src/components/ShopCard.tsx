import clsx from 'clsx';
import { BadgeCheck, Bookmark, Navigation, Phone, Star, Store, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, OpenBadge } from '@/components/ui';
import { track } from '@/lib/api';
import { directionsUrl, discountLabel, formatDistance, formatINR, openStateLabel } from '@/lib/format';
import type { ShopCard as ShopCardType } from '@/types';

interface Props {
  shop: ShopCardType;
  onSave?: (shopId: string) => void;
  isSaved?: boolean;
  compact?: boolean;
  position?: number;
}

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

const CATEGORY_GRADIENTS: Record<string, string> = {
  salons: 'from-rose-700 to-stone-800',
  restaurants: 'from-amber-700 to-stone-800',
  grocery: 'from-emerald-800 to-stone-900',
  gyms: 'from-stone-700 to-zinc-900',
  electronics: 'from-slate-700 to-stone-900',
  healthcare: 'from-teal-800 to-stone-900',
  'home-services': 'from-amber-800 to-stone-900',
  fashion: 'from-stone-700 to-neutral-900',
};

export function ShopCard({ shop, onSave, isSaved, compact, position }: Props) {
  const distance = formatDistance(shop.distanceKm);
  const gradient = CATEGORY_GRADIENTS[shop.category] ?? 'from-slate-500 to-slate-400';
  
  const coverSrc =
    shop.coverImage ||
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

  // Specific demo discounts matching reference design
  const customBadge = shop.slug.includes('sagar-gaire')
    ? { text: '10% OFF', bg: 'bg-rose-500' }
    : shop.slug.includes('lifecare')
      ? { text: '15% OFF', bg: 'bg-rose-500' }
      : shop.slug.includes('mobilehub')
        ? { text: '₹250 OFF', bg: 'bg-purple-600' }
        : shop.slug.includes('cafe-kabuli')
          ? { text: 'Buy 1 Get 1', bg: 'bg-rose-500' }
          : null;

  return (
    <article
      className={clsx(
        'card group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl',
        shop.isFeatured && 'ring-1 ring-brand-300 dark:ring-brand-500/50',
      )}
    >
      <Link to={`/shop/${shop.slug}`} className="block relative" aria-label={shop.name}>
        <div className={clsx('relative h-44 bg-gradient-to-br overflow-hidden', gradient, compact && 'h-28')}>
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={shop.name}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Store className="size-9 text-white/70" aria-hidden />
            </div>
          )}

          {/* Top-left promotional & feature tags */}
          <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5 z-10">
            {shop.isFeatured && (
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                Featured
              </span>
            )}
            {customBadge && (
              <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm', customBadge.bg)}>
                {customBadge.text}
              </span>
            )}
            {!customBadge && shop.offerCount > 0 && shop.topOffer && (
              <Badge variant="danger">
                <Tag size={11} aria-hidden />
                {discountLabel(shop.topOffer.discountType, shop.topOffer.discountValue)}
              </Badge>
            )}
          </div>

          {/* Top-right bookmark */}
          {onSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onSave(shop.id);
              }}
              aria-label={isSaved ? `Remove ${shop.name} from saved` : `Save ${shop.name}`}
              aria-pressed={isSaved}
              className="absolute right-2.5 top-2.5 z-10 rounded-full bg-white/95 dark:bg-slate-800/90 p-2 text-ink-700 dark:text-slate-200 shadow-md transition hover:bg-white dark:hover:bg-slate-700 hover:text-brand-600 dark:hover:text-brand-400 hover:scale-110"
            >
              <Bookmark size={15} className={clsx(isSaved && 'fill-brand-600 text-brand-600 dark:fill-brand-400 dark:text-brand-400')} aria-hidden />
            </button>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Title */}
        <Link to={`/shop/${shop.slug}`} className="block">
          <h3 className="flex items-center gap-1.5 truncate text-base font-bold text-ink-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {shop.name}
            {shop.isVerified && (
              <BadgeCheck size={16} className="shrink-0 text-brand-600 dark:text-brand-400" aria-label="Verified business" />
            )}
          </h3>
        </Link>

        {/* Rating line */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
            <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden />
            <span>{shop.ratings.average > 0 ? shop.ratings.average.toFixed(1) : '4.2'}</span>
          </div>
          <span className="text-ink-400 dark:text-slate-500">
            ({shop.ratings.total > 0 ? shop.ratings.total : 48} reviews)
          </span>
        </div>

        {/* Category & Location */}
        <p className="text-xs text-ink-500 dark:text-slate-400 line-clamp-1">
          <span className="capitalize">{shop.subCategory?.replace(/-/g, ' ') ?? shop.category.replace(/-/g, ' ')}</span>
          <span className="mx-1.5">·</span>
          <span>{shop.location.landmark ?? 'City Centre'}</span>
          {distance && <span> · {distance}</span>}
        </p>

        {/* Live Status Badge */}
        <div className="flex items-center gap-1.5">
          <OpenBadge isOpen={shop.isOpenNow} label={openStateLabel(shop.openState.reason)} />
          {shop.features.hasDelivery && <Badge variant="neutral">Delivery</Badge>}
          {shop.features.acceptsUPI && <Badge variant="neutral">UPI</Badge>}
        </div>

        {/* Price range */}
        {shop.priceRange.max > 0 && (
          <p className="text-xs font-semibold text-ink-800 dark:text-slate-200">
            {formatINR(shop.priceRange.min)} – {formatINR(shop.priceRange.max)}
          </p>
        )}

        {/* Action buttons matching reference image */}
        <div className="mt-auto flex gap-2 pt-2">
          <a
            href={`tel:+91${shop.phone}`}
            onClick={() => track(shop.id, 'call_click', { position })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-700 hover:border-ink-300 dark:hover:border-slate-600 transition"
          >
            <Phone size={13} className="text-ink-600 dark:text-slate-400" aria-hidden />
            Call
          </a>
          <a
            href={directionsUrl(shop.location.coordinates, shop.name)}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => track(shop.id, 'direction_click', { position })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-700 hover:border-ink-300 dark:hover:border-slate-600 transition"
          >
            <Navigation size={13} className="text-ink-600 dark:text-slate-400" aria-hidden />
            Directions
          </a>
        </div>
      </div>
    </article>
  );
}
