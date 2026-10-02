import clsx from 'clsx';
import {
  BarChart3,
  Bookmark,
  ChevronDown,
  Facebook,
  Heart,
  Instagram,
  Linkedin,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sun,
  Twitter,
  User as UserIcon,
  X,
  Youtube,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { LocationPicker } from '@/components/SearchBar';
import { ShopzyAssistant } from '@/components/ShopzyAssistant';
import { ScrollToTop, ToastViewport } from '@/components/ui';
import { initials } from '@/lib/format';
import { useClickOutside, useDebounced } from '@/lib/hooks';
import { useCategories, useSavedShops, useSuggestions } from '@/lib/queries';
import { useAuth, useTheme, useToasts } from '@/store';

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 group py-0.5" aria-label="Shopzy home">
      <img
        src="/logo.png"
        alt="Shopzy logo"
        className="size-9 object-contain transition-transform group-hover:scale-105"
      />
      <div className="flex flex-col">
        <span className="text-2xl font-bold tracking-tight text-white leading-none">
          Shop<span className="text-sky-400">zy</span>
        </span>
        <span className="hidden text-[10px] font-normal text-slate-400 tracking-tight leading-none mt-1 sm:block">
          Local Shops, Stronger Communities.
        </span>
      </div>
    </Link>
  );
}

function CategoriesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const { data: categories = [] } = useCategories();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex items-center gap-1 py-2 text-[14px] font-normal transition-colors select-none',
          open ? 'text-white font-medium' : 'text-slate-300 hover:text-white',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>Categories</span>
        <ChevronDown
          size={13}
          className={clsx('transition-transform duration-200 text-slate-400', open && 'rotate-180 text-sky-400')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-700/80 bg-[#061933]/98 backdrop-blur-md p-2 shadow-2xl text-left"
        >
          <div className="grid grid-cols-1 gap-0.5">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/search?category=${c.slug}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/80 hover:text-sky-400 transition"
              >
                <span>{c.name}</span>
                {c.shopCount !== undefined && (
                  <span className="text-[10px] text-slate-500 font-normal">{c.shopCount}</span>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-1.5 border-t border-slate-800 pt-1.5 px-1">
            <Link
              to="/categories"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/10 transition"
            >
              <span>View All Categories</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NavSearchBar() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const navigate = useNavigate();
  const debounced = useDebounced(value, 200);
  const { data: suggestions = [] } = useSuggestions(debounced);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim();
    if (!query) return;
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleSelectSuggestion(text: string, slug?: string) {
    setOpen(false);
    inputRef.current?.blur();
    if (slug) {
      navigate(`/shop/${slug}`);
    } else {
      setValue(text);
      navigate(`/search?q=${encodeURIComponent(text)}`);
    }
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-2 sm:mx-4">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-full bg-slate-900/60 border border-slate-700/80 px-3.5 py-1.5 transition-colors focus-within:border-sky-400/80 focus-within:bg-slate-900/90 shadow-inner"
      >
        <Search size={15} className="text-slate-400 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for shops, services, products..."
          aria-label="Search"
          className="ml-2 w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
        />
        <kbd className="ml-1.5 hidden md:flex shrink-0 items-center rounded border border-slate-700/80 bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 shadow-xs select-none">
          ⌘ K
        </kbd>
      </form>

      {open && value.trim().length >= 2 && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#061933]/98 backdrop-blur-md p-1.5 shadow-2xl text-left">
          {suggestions.map((s) => (
            <button
              key={`${s.type}-${s.label}`}
              type="button"
              onClick={() => handleSelectSuggestion(s.label, 'slug' in s ? (s as any).slug : undefined)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/80 hover:text-sky-400 transition"
            >
              <Search size={13} className="text-slate-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.label}</span>
                {s.sublabel && <span className="block truncate text-[10px] text-slate-400">{s.sublabel}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistButton() {
  const { data: saved = [] } = useSavedShops();

  return (
    <Link
      to="/saved"
      className="relative grid size-9 place-items-center rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
      aria-label={`Saved shops (${saved.length})`}
      title="Saved shops"
    >
      <Heart size={18} />
      <span className="absolute -top-0.5 -right-0.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white leading-none">
        {saved.length}
      </span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const navigate = useNavigate();
  const push = useToasts((s) => s.push);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/60 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition shadow-sm"
        >
          <UserIcon size={14} className="text-sky-400" aria-hidden />
          <span>Sign In</span>
          <ChevronDown size={12} className="text-slate-400" aria-hidden />
        </Link>
        <Link
          to="/register"
          className="rounded-full bg-white hover:bg-slate-100 text-[#03152d] font-semibold text-xs px-4 py-2 shadow-sm transition active:scale-95 text-center"
        >
          Get Started
        </Link>
      </div>
    );
  }

  const name = user.profile.firstName ?? user.email.split('@')[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/60 p-1 pr-2.5 text-slate-200 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid size-7 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white">
          {initials(name)}
        </span>
        <span className="hidden max-w-24 truncate text-xs font-medium text-white md:block">{name}</span>
        <ChevronDown size={12} className="text-slate-400" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-700/80 bg-[#061933]/98 backdrop-blur-md py-1.5 shadow-2xl text-left"
        >
          <div className="border-b border-slate-800 px-4 pb-2 pt-1">
            <p className="truncate text-xs font-semibold text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-sky-400">
              {user.role.replace('_', ' ')}
            </p>
          </div>

          <MenuLink to="/saved" icon={<Bookmark size={14} />} onClick={() => setOpen(false)}>
            Saved shops
          </MenuLink>
          <MenuLink to="/account" icon={<UserIcon size={14} />} onClick={() => setOpen(false)}>
            My account
          </MenuLink>
          {isOwner() && (
            <MenuLink to="/owner" icon={<BarChart3 size={14} />} onClick={() => setOpen(false)}>
              Owner dashboard
            </MenuLink>
          )}
          {isAdmin() && (
            <MenuLink to="/admin" icon={<Shield size={14} />} onClick={() => setOpen(false)}>
              Admin panel
            </MenuLink>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              push('Signed out', 'success');
              navigate('/');
            }}
            className="flex w-full items-center gap-2.5 border-t border-slate-800 px-4 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/30"
          >
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800/80 hover:text-sky-400 transition"
    >
      <span className="text-slate-400">{icon}</span>
      {children}
    </Link>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 transition-colors">
      <ScrollToTop trigger={routerLocation.pathname} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Header bar matching user reference image */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#03152d]/98 backdrop-blur-md text-white transition-colors">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5 lg:gap-7 shrink-0">
            <Logo />

            {/* Navigation Links in Center */}
            <nav className="hidden items-center gap-5 lg:gap-7 md:flex" aria-label="Main">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  clsx(
                    'relative py-2 text-[14px] transition-colors select-none',
                    isActive
                      ? 'text-sky-400 font-medium after:absolute after:-bottom-[19px] after:left-0 after:right-0 after:h-[2px] after:bg-sky-400 after:rounded-full'
                      : 'text-slate-300 hover:text-white font-normal',
                  )
                }
              >
                Home
              </NavLink>

              <CategoriesDropdown />

              <NavLink
                to="/search"
                className={({ isActive }) =>
                  clsx(
                    'relative py-2 text-[14px] transition-colors select-none',
                    isActive
                      ? 'text-sky-400 font-medium after:absolute after:-bottom-[19px] after:left-0 after:right-0 after:h-[2px] after:bg-sky-400 after:rounded-full'
                      : 'text-slate-300 hover:text-white font-normal',
                  )
                }
              >
                Explore
              </NavLink>

              <NavLink
                to="/tourist-places"
                className={({ isActive }) =>
                  clsx(
                    'relative py-2 text-[14px] transition-colors select-none flex items-center gap-1.5',
                    isActive
                      ? 'text-sky-400 font-medium after:absolute after:-bottom-[19px] after:left-0 after:right-0 after:h-[2px] after:bg-sky-400 after:rounded-full'
                      : 'text-slate-300 hover:text-white font-normal',
                  )
                }
              >
                <span>Tourist Places</span>
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Bhopal
                </span>
              </NavLink>
            </nav>
          </div>

          {/* Search Bar in Navbar */}
          <NavSearchBar />

          {/* Right Controls: Location, Dark Mode, Wishlist, Auth */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick search button on small mobile screens */}
            <Link
              to="/search"
              className="grid size-9 place-items-center rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition sm:hidden"
              aria-label="Search"
              title="Search"
            >
              <Search size={18} />
            </Link>

            <LocationPicker pill dark className="hidden lg:block" />

            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="grid size-9 place-items-center rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* Wishlist Button */}
            <WishlistButton />

            {/* Auth Actions: Sign In + Get Started (No Cart!) */}
            <UserMenu />

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="btn-ghost btn-sm text-slate-300 hover:text-white hover:bg-slate-800/60 md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-slate-800 bg-[#03152d]/98 backdrop-blur-md px-4 py-4 md:hidden shadow-2xl" aria-label="Mobile">
            <div className="mb-3 flex items-center justify-between gap-2">
              <LocationPicker pill dark className="flex-1" />
            </div>

            <div className="mb-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = (e.currentTarget.elements.namedItem('mobile-q') as HTMLInputElement)?.value.trim();
                  if (q) {
                    setMobileOpen(false);
                    navigate(`/search?q=${encodeURIComponent(q)}`);
                  }
                }}
                className="flex items-center rounded-full bg-slate-900/80 border border-slate-700/80 px-3 py-1.5"
              >
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  name="mobile-q"
                  type="search"
                  placeholder="Search shops, services..."
                  className="ml-2 w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
                />
              </form>
            </div>

            <div className="flex flex-col space-y-1">
              <NavLink
                to="/"
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition',
                    isActive ? 'bg-sky-500/15 text-sky-400 font-semibold' : 'text-slate-300 hover:bg-slate-800/60',
                  )
                }
              >
                Home
              </NavLink>

              <NavLink
                to="/categories"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition',
                    isActive ? 'bg-sky-500/15 text-sky-400 font-semibold' : 'text-slate-300 hover:bg-slate-800/60',
                  )
                }
              >
                Categories
              </NavLink>

              <NavLink
                to="/search"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition',
                    isActive ? 'bg-sky-500/15 text-sky-400 font-semibold' : 'text-slate-300 hover:bg-slate-800/60',
                  )
                }
              >
                Explore
              </NavLink>

              <NavLink
                to="/tourist-places"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition',
                    isActive ? 'bg-sky-500/15 text-sky-400 font-semibold' : 'text-slate-300 hover:bg-slate-800/60',
                  )
                }
              >
                <span>Tourist Places</span>
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Bhopal
                </span>
              </NavLink>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <ToastViewport />
      <ShopzyAssistant />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 transition-colors">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-5 lg:px-8">
        {/* Column 1: Brand */}
        <div className="md:col-span-1">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Shopzy home">
            <img src="/logo.png" alt="Shopzy logo" className="size-9 object-contain" />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Shop<span className="text-sky-500">zy</span>
            </span>
          </Link>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Local Shops, Stronger Communities.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Quick Links</h3>
          <ul className="space-y-2">
            <li><Link to="/" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Home</Link></li>
            <li><Link to="/search" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Explore</Link></li>
            <li><Link to="/tourist-places" className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors flex items-center gap-1"><span>Tourist Places</span><span className="text-[9px] uppercase px-1 py-0.2 bg-amber-400/20 text-amber-500 rounded">Bhopal</span></Link></li>
            <li><Link to="/categories" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Categories</Link></li>
            <li><Link to="/register?role=owner" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">For Business</Link></li>
            <li><Link to="/about" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">About</Link></li>
            <li><Link to="/blog" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Blog</Link></li>
          </ul>
        </div>

        {/* Column 3: Categories */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Categories</h3>
          <ul className="space-y-2">
            <li><Link to="/search?category=restaurants" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Restaurants</Link></li>
            <li><Link to="/search?category=grocery" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Grocery</Link></li>
            <li><Link to="/search?category=salons" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Salons & Spa</Link></li>
            <li><Link to="/search?category=healthcare" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Healthcare</Link></li>
            <li><Link to="/search?category=home-services" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Home Services</Link></li>
            <li><Link to="/categories" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 transition-colors">View All</Link></li>
          </ul>
        </div>

        {/* Column 4: Support */}
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Support</h3>
          <ul className="space-y-2">
            <li><Link to="/about" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Help Center</Link></li>
            <li><Link to="/about" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Contact Us</Link></li>
            <li><Link to="/register?role=owner" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">List Your Business</Link></li>
            <li><Link to="/terms" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Terms of Service</Link></li>
            <li><Link to="/privacy" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/about" className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">FAQs</Link></li>
          </ul>
        </div>

        {/* Column 5: Stay Connected */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Stay Connected</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Follow us for updates</p>
          <div className="flex items-center gap-2">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition"
              aria-label="Instagram"
            >
              <Instagram size={15} />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
              aria-label="Facebook"
            >
              <Facebook size={15} />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              aria-label="Twitter / X"
            >
              <Twitter size={15} />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
              aria-label="LinkedIn"
            >
              <Linkedin size={15} />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              aria-label="YouTube"
            >
              <Youtube size={15} />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/80 dark:border-slate-800 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            Made with <Heart size={13} className="fill-rose-500 text-rose-500" /> in India
          </div>
          <div>
            © {new Date().getFullYear()} SHOPZY. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}


