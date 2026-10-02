import { Bookmark } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ShopCard } from '@/components/ShopCard';
import { EmptyState, LoadingBlock } from '@/components/ui';
import { formatCount } from '@/lib/format';
import { useDocumentMeta } from '@/lib/hooks';
import { useCategories, useSavedShops, useToggleSaved } from '@/lib/queries';
import { useAuth, useToasts } from '@/store';

export { AccountPage } from './AccountPage';

export function CategoriesPage() {
  useDocumentMeta(
    'All categories — local businesses in Bhopal | SHOPZY',
    'Browse every category of local business on SHOPZY: salons, restaurants, groceries, gyms, electronics, healthcare and more.',
  );

  const { data: categories = [], isLoading } = useCategories();

  if (isLoading) return <LoadingBlock label="Loading categories…" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">All categories</h1>
        <p className="mt-1 text-sm text-ink-500">Everything your neighbourhood has to offer</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            to={`/search?category=${category.slug}`}
            className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${category.color}1a`, color: category.color }}
              >
                <CategoryIcon name={category.icon} className="size-6" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-ink-900 group-hover:text-brand-700">{category.name}</h2>
                <p className="mt-0.5 text-xs text-ink-400">{formatCount(category.shopCount)} shops</p>
                {category.description && <p className="mt-2 text-sm text-ink-500">{category.description}</p>}
              </div>
            </div>

            {category.subCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {category.subCategories.map((sub) => (
                  <span key={sub.slug} className="chip bg-ink-100 text-ink-600">
                    {sub.name}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SavedShopsPage() {
  useDocumentMeta('Saved shops | SHOPZY');

  const user = useAuth((s) => s.user);
  const { data: shops = [], isLoading } = useSavedShops();
  const toggleSaved = useToggleSaved();
  const push = useToasts((s) => s.push);

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) return <LoadingBlock label="Loading your saved shops…" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Saved shops</h1>
        <p className="mt-1 text-sm text-ink-500">
          {shops.length} shop{shops.length === 1 ? '' : 's'} in your list
        </p>
      </header>

      {shops.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-8" />}
          title="Nothing saved yet"
          description="Tap the bookmark icon on any shop to keep it here for later."
          action={
            <Link to="/search" className="btn-primary btn-md">
              Explore shops
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              isSaved
              onSave={(id) =>
                toggleSaved.mutate(id, { onSuccess: () => push('Removed from saved', 'success') })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}


export function NotFoundPage() {
  useDocumentMeta('Page not found | SHOPZY');

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-brand-200">404</p>
      <h1 className="mt-3 text-xl font-bold text-ink-900 dark:text-white">We can't find that page</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">
        The link may be broken, or the shop may have been removed from SHOPZY.
      </p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="btn-primary btn-md">
          Back to home
        </Link>
        <Link to="/search" className="btn-secondary btn-md">
          Explore shops
        </Link>
      </div>
    </div>
  );
}

export function AboutPage() {
  useDocumentMeta('About SHOPZY — Supporting Local Businesses in Bhopal');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
          Our Mission
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Empowering Local Shops in Bhopal
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
          Connecting neighbours with the best local shops, transparent prices, and stronger communities.
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>
          SHOPZY was built with a simple conviction: the heart of every Indian city lives in its neighbourhood
          kirana stores, tailors, salons, cafes, and independent specialists. For generations, local businesses
          have built personal relationships, trust, and community vitality.
        </p>
        <div className="grid gap-6 sm:grid-cols-3 my-8 not-prose">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 text-center">
            <p className="text-3xl font-black text-blue-600">5,000+</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Verified Shops</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 text-center">
            <p className="text-3xl font-black text-blue-600">50,000+</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Happy Citizens</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 text-center">
            <p className="text-3xl font-black text-blue-600">100%</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Bhopal Local</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BlogPage() {
  useDocumentMeta('SHOPZY Stories & Local Bhopal Guide');

  const posts = [
    {
      title: 'Top 10 Hidden Gem Cafes Around Upper Lake Bhopal',
      date: 'Sept 15, 2026',
      readTime: '4 min read',
      tag: 'Food & Drinks',
      excerpt: 'From cozy rooftop views along VIP Road to artisanal chai spots, discover the best places to unwind.',
    },
    {
      title: 'Why Shopping Local Keeps ₹80 of Every ₹100 in Bhopal',
      date: 'Sept 10, 2026',
      readTime: '3 min read',
      tag: 'Community',
      excerpt: 'How choosing your local kirana and pharmacy directly supports neighbourhood schools, jobs, and parks.',
    },
    {
      title: 'A Guide to Traditional Handloom & Zari Work in Chowk',
      date: 'Sept 02, 2026',
      readTime: '5 min read',
      tag: 'Fashion',
      excerpt: 'Discover Bhopal’s rich heritage of master artisans, fabrics, and embroidery that have flourished for decades.',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          SHOPZY Local Blog
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Stories, neighbourhood guides, and updates from Bhopal's vibrant market scene.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.title}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:shadow-md transition"
          >
            <div>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                {post.tag}
              </span>
              <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white leading-snug">
                {post.title}
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {post.excerpt}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span>{post.date}</span>
              <span>{post.readTime}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function TermsPage() {
  useDocumentMeta('Terms of Service | SHOPZY', 'Terms and conditions governing the use of the SHOPZY platform.');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Legal Agreement
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">
          Last updated: September 2026 · Effective immediately for all users and business partners.
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">1. Platform Nature & Overview</h2>
          <p>
            SHOPZY is a local business discovery and price comparison platform operating in India. We connect consumers
            with independent merchants, retailers, and local service providers in Bhopal and surrounding regions.
            SHOPZY operates as an intermediary under Section 79 of the Information Technology Act, 2000.
          </p>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">2. Price Information & Listing Accuracy</h2>
          <p>
            Prices, discount offers, and product availability displayed on SHOPZY are published either directly by
            verified merchant owners or compiled through public catalog aggregation. While we perform verification
            checks and mandate truthful pricing, merchants remain solely responsible for the products and services
            they sell on their physical premises.
          </p>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">3. Merchant & Owner Obligations</h2>
          <p>
            Shop owners who register, claim listings, or publish catalogs agree to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-600 dark:text-slate-400">
            <li>Provide authentic business licensing, contact details, and opening schedules.</li>
            <li>Maintain non-deceptive pricing and honour active promotional discount vouchers.</li>
            <li>Refrain from uploading prohibited content, copyrighted imagery without permission, or malicious links.</li>
          </ul>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">4. Reviews & Community Guidelines</h2>
          <p>
            Reviews must reflect genuine consumer experiences. Paid endorsements, defamatory remarks, hate speech,
            and competitor sabotage are strictly prohibited and will result in immediate content removal and account
            suspension under our review moderation policy.
          </p>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">5. Grievance Redressal</h2>
          <p>
            In accordance with the Information Technology Rules, 2021, any grievance regarding content, listings, or
            terms may be addressed to our Grievance Officer:
          </p>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 font-mono text-xs text-ink-700 dark:text-slate-300">
            <p className="font-bold">Grievance Officer: Shopzy Compliance Cell</p>
            <p>Email: legal@shopzy.in</p>
            <p>Address: Bhopal, Madhya Pradesh, India — 462001</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  useDocumentMeta('Privacy Policy | SHOPZY', 'How SHOPZY collects, protects and handles personal data under DPDP Act 2023.');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          DPDP Act 2023 Compliant
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">
          Your privacy matters to us. Learn how your data is protected, stored, and managed.
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">1. Data We Collect</h2>
          <p>
            We collect only what is strictly necessary to deliver local discovery and verified price comparison:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-600 dark:text-slate-400">
            <li><strong>Account Data:</strong> Name, verified email, and 10-digit mobile number.</li>
            <li><strong>Location Data:</strong> Approximate or precise GPS coordinates (only when explicitly permitted by you) to calculate distances to nearby shops.</li>
            <li><strong>Usage & Search Analytics:</strong> Search queries and bookmark preferences, stored securely to recommend trending items.</li>
          </ul>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">2. How Your Data Is Protected</h2>
          <p>
            We adhere to strict data security standards:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-600 dark:text-slate-400">
            <li>All passwords are encrypted with bcrypt (work factor 12). Plain text passwords are never stored.</li>
            <li>JWT tokens feature automated rotation with single-use replay detection.</li>
            <li>We do not sell personal data, phone numbers, or browsing histories to third-party telemarketers.</li>
          </ul>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">3. Your DPDP Act Rights: Portability & Erasure</h2>
          <p>
            Under India's Digital Personal Data Protection Act 2023, you retain absolute ownership of your data:
          </p>
          <div className="grid gap-4 sm:grid-cols-2 not-prose mt-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-sm text-ink-900 dark:text-white">Right to Portability (§11)</h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-slate-400">
                You can download a complete JSON archive of your personal data, reviews, and saved shops anytime from your account settings.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-sm text-ink-900 dark:text-white">Right to Erasure (§12)</h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-slate-400">
                With a single tap on "Delete my account", your PII is permanently anonymized, and session credentials are wiped.
              </p>
            </div>
          </div>
        </section>

        <section className="card p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">4. Contact Data Protection Officer</h2>
          <p>
            For privacy questions or rights requests, contact our Data Protection Officer at:
            <a href="mailto:privacy@shopzy.in" className="text-brand-600 font-medium ml-1 hover:underline">
              privacy@shopzy.in
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

