import clsx from 'clsx';
import {
  ArrowRight,
  ChevronRight,
  Heart,
  ListFilter,
  MapPin,
  Navigation,
  Search,
  Store,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SearchBar } from '@/components/SearchBar';
import { ShopCard } from '@/components/ShopCard';
import { EmptyState, ShopCardSkeleton } from '@/components/ui';
import { useDocumentMeta } from '@/lib/hooks';
import { useCategories, useSearch, useToggleSaved, useSavedShops } from '@/lib/queries';
import { useAuth, useLocation, useToasts } from '@/store';

interface CategoryConfig {
  slug: string;
  name: string;
  countText: string;
  image: string;
  iconBg: string;
  iconText: string;
  icon: string;
}

const CATEGORIES_CONFIG: CategoryConfig[] = [
  {
    slug: 'restaurants',
    name: 'Restaurants & Cafes',
    countText: '120+ shops',
    image: '/categories/cat_food.jpg',
    iconBg: 'bg-amber-100 dark:bg-amber-950/60',
    iconText: 'text-amber-600 dark:text-amber-400',
    icon: 'UtensilsCrossed',
  },
  {
    slug: 'grocery',
    name: 'Grocery & Kirana',
    countText: '85+ shops',
    image: '/categories/cat_grocery.jpg',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    icon: 'ShoppingBag',
  },
  {
    slug: 'salons',
    name: 'Salons & Spa',
    countText: '60+ shops',
    image: '/categories/cat_salon.jpg',
    iconBg: 'bg-rose-100 dark:bg-rose-950/60',
    iconText: 'text-rose-500 dark:text-rose-400',
    icon: 'Scissors',
  },
  {
    slug: 'gyms',
    name: 'Gym & Fitness',
    countText: '45+ shops',
    image: '/categories/cat_gym.jpg',
    iconBg: 'bg-sky-100 dark:bg-sky-950/60',
    iconText: 'text-sky-600 dark:text-sky-400',
    icon: 'Dumbbell',
  },
  {
    slug: 'electronics',
    name: 'Electronics & Repair',
    countText: '70+ shops',
    image: '/categories/cat_tech.jpg',
    iconBg: 'bg-purple-100 dark:bg-purple-950/60',
    iconText: 'text-purple-600 dark:text-purple-400',
    icon: 'Laptop',
  },
  {
    slug: 'healthcare',
    name: 'Healthcare & Pharmacy',
    countText: '35+ shops',
    image: '/categories/cat_health.jpg',
    iconBg: 'bg-teal-100 dark:bg-teal-950/60',
    iconText: 'text-teal-600 dark:text-teal-400',
    icon: 'Stethoscope',
  },
  {
    slug: 'home-services',
    name: 'Home Services',
    countText: '55+ shops',
    image: '/categories/cat_repair.jpg',
    iconBg: 'bg-orange-100 dark:bg-orange-950/60',
    iconText: 'text-orange-600 dark:text-orange-400',
    icon: 'Wrench',
  },
  {
    slug: 'fashion',
    name: 'Fashion & Apparel',
    countText: '90+ shops',
    image: '/categories/cat_fashion.jpg',
    iconBg: 'bg-pink-100 dark:bg-pink-950/60',
    iconText: 'text-pink-600 dark:text-pink-400',
    icon: 'Shirt',
  },
];

export function HomePage() {
  useDocumentMeta(
    'SHOPZY — Discover local shops & compare prices in Bhopal',
    'Find salons, restaurants, gyms, groceries and services near you in Bhopal. Compare real prices, check live opening hours and read verified reviews.',
  );

  const navigate = useNavigate();
  const { coords, radius } = useLocation();
  const { isLoading: categoriesLoading } = useCategories();
  const user = useAuth((s) => s.user);
  const { data: saved = [] } = useSavedShops();
  const toggleSaved = useToggleSaved();
  const push = useToasts((s) => s.push);

  const savedIds = new Set(saved.map((s) => s.id));

  const { data: featured, isLoading: featuredLoading } = useSearch({
    ...(coords ? { lat: coords.lat, lng: coords.lng, radius } : {}),
    sort: 'popularity',
    limit: 4,
  });

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

  return (
    <>
      {/* --- Hero Section ----------------------------------------------- */}
      <section className="relative overflow-hidden bg-[#031326] text-white">
        {/* Background Image: Scenic Bhopal Upper Lake Panorama */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat bg-right lg:bg-center"
          style={{ backgroundImage: `url('/bhopal_hero.jpg')` }}
          aria-hidden
        />

        {/* Navy Gradient Overlay: smooth fade to reveal Bhopal architecture & lake */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,19,38,0.98) 0%, rgba(4,26,53,0.93) 38%, rgba(5,34,68,0.78) 60%, rgba(5,34,68,0.22) 82%, rgba(5,34,68,0.08) 100%)',
          }}
          aria-hidden
        />

        {/* Top-Right Handwritten Script Branding Callout */}
        <div className="absolute top-6 right-6 lg:top-8 lg:right-12 text-right hidden sm:block pointer-events-none select-none -rotate-2 z-10">
          <p className="font-handwriting text-3xl lg:text-4xl font-bold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] leading-tight">
            Bhopal
          </p>
          <p className="font-handwriting text-xl lg:text-2xl font-bold text-slate-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] leading-tight">
            More Than a City
          </p>
          <p className="font-handwriting text-lg lg:text-xl font-medium text-slate-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] leading-tight">
            A Community <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">♥</span>
          </p>
        </div>

        {/* Bottom-Right Lake Location Tag */}
        <div className="absolute right-6 bottom-6 lg:right-12 lg:bottom-8 hidden md:flex items-center gap-2.5 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] z-10 pointer-events-none select-none">
          <div className="flex size-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm">
            <MapPin size={14} className="text-white fill-white/20" />
          </div>
          <div className="leading-tight text-left">
            <span className="block text-xs font-bold text-white tracking-tight">Upper Lake</span>
            <span className="block text-[11px] font-medium text-sky-200">Bhopal, MP</span>
          </div>
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8">
          <div className="max-w-2xl text-left">
            {/* Main H1 Title */}
            <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              Every local shop.
              <br />
              <span className="text-[#38bdf8]">
                Real prices<span className="text-white">, side by side.</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
              Search, compare and connect with verified local businesses
              <br className="hidden sm:inline" /> in your city. Better choices. Stronger neighbourhoods.
            </p>

            {/* Hero Search Bar */}
            <div className="mt-8 max-w-2xl">
              <SearchBar variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* --- Browse by Category Section (Photo Cards) ------------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Browse by Category
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Everything you need, right in your neighbourhood.
            </p>
          </div>
          <Link to="/categories" className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
            View all categories →
          </Link>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {CATEGORIES_CONFIG.map((cat) => (
              <Link
                key={cat.slug}
                to={`/search?category=${cat.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {/* Photo Top */}
                <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Body with overlapping circular icon and category info */}
                <div className="flex flex-1 flex-col items-center p-3 pt-0 text-center">
                  <span
                    className={clsx(
                      'relative z-10 grid size-9 place-items-center rounded-full -mt-4.5 mb-2 shadow-sm border-2 border-white dark:border-slate-900',
                      cat.iconBg,
                      cat.iconText,
                    )}
                  >
                    <CategoryIcon name={cat.icon} className="size-4.5" />
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </span>
                  <span className="mt-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {cat.countText}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* --- Popular Near You (Top-Rated Businesses) ------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Popular Near You
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Top-rated businesses within 10 km of your location.
            </p>
          </div>
          <Link to="/search?sort=popularity" className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
            View all →
          </Link>
        </div>

        {featuredLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ShopCardSkeleton key={i} />
            ))}
          </div>
        ) : featured?.items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.items.map((shop, i) => (
              <ShopCard key={shop.id} shop={shop} position={i} onSave={onSave} isSaved={savedIds.has(shop.id)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Store className="size-8" />}
            title="No shops found yet"
            description="Try widening your search radius or exploring a category."
            action={
              <Link to="/search" className="btn-primary btn-md">
                Explore all shops
              </Link>
            }
          />
        )}
      </section>

      {/* --- How It Works Section (Horizontal 3-Step Flow) ------------- */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-6 sm:p-10 shadow-xs">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">How It Works</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Find what you need in 3 simple steps
              </h2>
            </div>
            <div className="text-right select-none">
              <p className="font-handwriting text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 -rotate-2 leading-tight">
                Local Choices.
              </p>
              <p className="font-handwriting text-xl sm:text-2xl font-bold text-blue-500 dark:text-blue-300 -rotate-2 leading-tight">
                Real Impact.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 md:gap-4 relative items-center">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Search size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Search</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Find shops, services or products in your area.
                </p>
              </div>
            </div>

            {/* Divider 1 */}
            <div className="hidden md:flex items-center justify-center text-slate-300 dark:text-slate-600">
              <ChevronRight size={22} />
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <ListFilter size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Compare</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Check prices, reviews, opening hours and more.
                </p>
              </div>
            </div>

            {/* Divider 2 */}
            <div className="hidden md:flex items-center justify-center text-slate-300 dark:text-slate-600">
              <ChevronRight size={22} />
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Navigation size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Connect</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Call, get directions or visit the shop directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Grow Together / Business Owner CTA Banner (Reference Match) ------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.25rem] bg-[#021838] sm:bg-gradient-to-r sm:from-[#021530] sm:via-[#032048] sm:to-[#042d66] text-white shadow-2xl p-6 sm:p-10 lg:p-12 xl:p-14 relative flex flex-col lg:flex-row items-center justify-between gap-10 border border-blue-900/40">
          {/* Subtle Ambient Backdrop Glow */}
          <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-blue-600/15 blur-3xl" aria-hidden />

          {/* Left Column: Copy, Features, Buttons */}
          <div className="max-w-xl text-left relative z-10">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-3.5 py-1 text-xs font-medium text-sky-300 shadow-sm backdrop-blur-sm">
              <Store size={14} className="text-sky-400" aria-hidden />
              <span>For Business Owners</span>
            </div>

            {/* Headline */}
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
              Are you a <br />
              <span className="text-sky-400 relative inline-block">
                business owner?
                {/* 3 action spark lines */}
                <svg
                  className="absolute -top-1 -right-7 sm:-right-8 text-sky-400 size-6 sm:size-7 select-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <line x1="8" y1="6" x2="4" y2="2" />
                  <line x1="14" y1="4" x2="16" y2="1" />
                  <line x1="18" y1="9" x2="23" y2="7" />
                </svg>
              </span>
            </h2>

            {/* Subtitle */}
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
              List your shop for free and reach more local customers.
              <br />
              Be a part of a stronger, smarter Bhopal.
            </p>

            {/* 3 Feature Items */}
            <div className="mt-7 flex flex-wrap items-center gap-5 sm:gap-7">
              {/* Feature 1 */}
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-blue-900/60 border border-blue-700/50 text-sky-400 shrink-0 shadow-inner">
                  <Tag size={19} />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-tight">Free Listing</p>
                  <p className="text-[11px] text-slate-400 leading-tight mt-1">No hidden charges</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-blue-900/60 border border-blue-700/50 text-sky-400 shrink-0 shadow-inner">
                  <Users size={19} />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-tight">More Customers</p>
                  <p className="text-[11px] text-slate-400 leading-tight mt-1">Get discovered locally</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-blue-900/60 border border-blue-700/50 text-sky-400 shrink-0 shadow-inner">
                  <TrendingUp size={19} />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-tight">Grow Your Business</p>
                  <p className="text-[11px] text-slate-400 leading-tight mt-1">Build a stronger presence</p>
                </div>
              </div>
            </div>

            {/* Action Buttons & Handwritten Doodle */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/register?role=owner"
                className="inline-flex items-center gap-2 rounded-full bg-[#0066f5] hover:bg-blue-600 active:bg-blue-700 px-6 sm:px-7 py-3 text-sm font-semibold text-white shadow-[0_4px_22px_rgba(0,102,245,0.45)] transition-all transform hover:-translate-y-0.5"
              >
                <span>List Your Business</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 active:bg-white/15 px-6 sm:px-7 py-3 text-sm font-medium text-white transition-all backdrop-blur-xs"
              >
                Learn More
              </Link>

              <div className="hidden xl:block ml-4 -rotate-6 select-none opacity-80">
                <span className="block font-serif italic text-xs tracking-wider text-slate-300">
                  Local Businesses
                </span>
                <span className="block font-serif italic text-xs tracking-wider text-slate-300 pl-3">
                  Stronger Communities
                </span>
              </div>
            </div>
          </div>

          {/* Right Side Storefront Showcase with Organic Backdrop & Floating Badges */}
          <div className="relative shrink-0 w-full lg:w-auto flex justify-center mt-6 lg:mt-0">
            {/* Organic Curved Blue Backing Layer */}
            <div
              className="absolute -inset-2.5 sm:-inset-4 bg-gradient-to-tr from-blue-600/70 via-sky-500/50 to-blue-700/70 rounded-[2.25rem] transform -rotate-1 scale-105 opacity-90 blur-xs"
              aria-hidden
            />

            {/* Top-Right Floating Glassmorphism Badge */}
            <div className="absolute -top-3 -right-2 sm:-top-5 sm:-right-4 z-20 flex items-center gap-3 rounded-2xl border border-white/25 bg-slate-900/60 backdrop-blur-md px-3.5 py-2.5 shadow-2xl text-white">
              <span className="grid size-9 place-items-center rounded-xl bg-blue-500/40 text-sky-300 shadow-inner">
                <Users size={18} />
              </span>
              <div>
                <p className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-none">10,000+</p>
                <p className="text-[10px] text-slate-200 leading-tight mt-1 font-medium">
                  Local Customers<br />Searching Daily
                </p>
              </div>
            </div>

            {/* Storefront Picture */}
            <img
              src="/storefront_cta.jpg"
              alt="Local shop storefront"
              className="relative z-10 w-full max-w-sm sm:max-w-md lg:max-w-[440px] h-64 sm:h-76 object-cover rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-white/25"
            />

            {/* Bottom-Right Floating White Pill Badge */}
            <div className="absolute -bottom-3 -right-2 sm:-bottom-4 sm:right-4 z-20 flex items-center gap-2.5 rounded-full bg-white px-4 py-2 shadow-2xl border border-slate-100 text-slate-900">
              <Heart size={16} className="fill-indigo-600 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Support Local</p>
                <p className="text-[10px] text-slate-500 leading-tight">Build a Better Bhopal</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

