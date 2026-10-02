import clsx from 'clsx';
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  LayoutGrid,
  LineChart,
  Pencil,
  Power,
  ScrollText,
  Search,
  Shield,
  Star,
  Store,
  Trash2,
  Users,
  XCircle,
  Bot,
  Sparkles,
  Scale,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShopEditor } from '@/components/ShopEditor';
import { Badge, EmptyState, LoadingBlock, Modal, Pagination } from '@/components/ui';
import { formatCount, formatDate, formatINR, titleCase } from '@/lib/format';
import { useDebounced, useDocumentMeta } from '@/lib/hooks';
import {
  useAdminAnalytics,
  useAdminAuditLog,
  useAdminCategories,
  useAdminDashboard,
  useAdminReviews,
  useAdminShops,
  useAdminUsers,
  useCreateCategory,
  useDeleteCategory,
  useDeleteShop,
  useMarketplaceInsights,
  useModerateReview,
  useSetUserRole,
  useSetUserStatus,
  useShop,
  useToggleFeatured,
  useToggleShopActive,
  useUpdateCategory,
  useVerifyShop,
} from '@/lib/queries';
import { useAuth, useToasts } from '@/store';
import { HoursCard, PhotoManager } from '@/pages/OwnerDashboardPage';
import type { AdminCategory, AdminShop, UserRole } from '@/types';

type Tab = 'overview' | 'shops' | 'users' | 'reviews' | 'categories' | 'analytics' | 'insights' | 'audit';

export function AdminPage() {
  useDocumentMeta('Admin panel | SHOPZY', 'Platform administration: verification queue, users and analytics.');

  const [tab, setTab] = useState<Tab>('overview');
  const user = useAuth((s) => s.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const { data: dashboard } = useAdminDashboard();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-ink-900 text-brand-400">
          <Shield size={20} aria-hidden />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Admin panel</h1>
            {isSuperAdmin && <Badge variant="brand">Super Admin · Full Access</Badge>}
          </div>
          <p className="text-sm text-ink-500">Platform health, shop approval gate, user management and system control</p>
        </div>
      </header>

      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-200">
        {(
          [
            ['overview', 'Overview'],
            ['shops', 'Shops & verification'],
            ['users', 'Users'],
            ['reviews', 'Reviews'],
            ['categories', 'Categories'],
            ['analytics', 'Analytics'],
            ['insights', 'AI Market Insights'],
            ['audit', 'Audit log'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              '-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors inline-flex items-center gap-2',
              tab === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700',
            )}
          >
            {label}
            {key === 'insights' && (
              <span className="rounded-full bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                New
              </span>
            )}
            {key === 'shops' && Boolean(dashboard?.counts.pendingShops) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {dashboard?.counts.pendingShops} pending
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab onReviewQueue={() => setTab('shops')} />}
      {tab === 'shops' && <ShopsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'insights' && <AiMarketInsightsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

function OverviewTab({ onReviewQueue }: { onReviewQueue: () => void }) {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) return <LoadingBlock label="Loading dashboard…" />;
  if (!data) return null;

  const { counts } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="size-4" />} label="Total users" value={formatCount(counts.totalUsers)} hint={`+${counts.newUsers30} in 30 days`} />
        <StatCard icon={<Store className="size-4" />} label="Active shops" value={formatCount(counts.activeShops)} hint={`${counts.totalShops} total`} />
        <StatCard
          icon={<BadgeCheck className="size-4" />}
          label="Verified"
          value={formatCount(counts.verifiedShops)}
          hint={`${data.verificationRate}% of active`}
        />
        <StatCard icon={<Star className="size-4" />} label="Reviews" value={formatCount(counts.totalReviews)} hint={`${formatCount(counts.searches7)} searches / 7d`} />
      </div>

      {counts.pendingShops > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm text-amber-900">
            <strong>{counts.pendingShops}</strong> shop{counts.pendingShops === 1 ? '' : 's'} waiting for verification.
          </p>
          <button type="button" onClick={onReviewQueue} className="btn-primary btn-sm">
            Review queue
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-900">Shops by category</h2>
          <ul className="space-y-2.5">
            {data.byCategory.map((c) => {
              const max = Math.max(...data.byCategory.map((x) => x.count), 1);
              return (
                <li key={c.category} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate capitalize text-ink-600">{titleCase(c.category)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-medium text-ink-700">{c.count}</span>
                  <span className="w-10 text-right text-xs text-amber-600">★{c.avgRating || '—'}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-900">Most viewed shops</h2>
          <ol className="space-y-2.5">
            {data.topShops.map((s, i) => (
              <li key={s.slug} className="flex items-center gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs font-bold text-ink-500">
                  {i + 1}
                </span>
                <Link to={`/shop/${s.slug}`} className="min-w-0 flex-1 truncate font-medium text-ink-800 hover:text-brand-600">
                  {s.name}
                </Link>
                <span className="shrink-0 text-xs text-amber-600">★{s.rating}</span>
                <span className="w-14 shrink-0 text-right text-xs text-ink-500">{formatCount(s.views)} views</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <span className="text-brand-600">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function ShopsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading } = useAdminShops({
    page,
    status: status || undefined,
    q: debouncedSearch || undefined,
  });

  const [reviewing, setReviewing] = useState<AdminShop | null>(null);
  const [editing, setEditing] = useState<AdminShop | null>(null);
  const toggleFeatured = useToggleFeatured();
  const toggleActive = useToggleShopActive();
  const deleteShop = useDeleteShop();
  const push = useToasts((s) => s.push);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">Super Admin Verification Gate:</span> Every shop added by an owner is queued here with status <strong>Pending</strong>. Shops remain strictly private and cannot be seen or searched by customers until you review and verify them.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['', 'All shops'],
              ['pending', 'Pending review'],
              ['verified', 'Verified (Live)'],
              ['rejected', 'Rejected'],
            ] as const
          ).map(([val, name]) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setStatus(val);
                setPage(1);
              }}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                status === val
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50',
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search shops by name…"
            aria-label="Search shops"
            className="input pl-10 text-xs py-1.5"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data?.items.length ? (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Shop</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Added</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((shop) => (
                  <tr key={shop.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/shop/${shop.slug}`} className="font-medium text-ink-800 hover:text-brand-600">
                        {shop.name}
                      </Link>
                      <p className="text-xs capitalize text-ink-500">
                        {titleCase(shop.category)} · {shop.location.city}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {shop.owner ? (
                        <>
                          <p className="text-ink-700">{shop.owner.name || '—'}</p>
                          <p className="text-xs text-ink-500">{shop.owner.email}</p>
                        </>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          shop.verificationStatus === 'verified'
                            ? 'success'
                            : shop.verificationStatus === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {titleCase(shop.verificationStatus.replace('_', ' '))}
                      </Badge>
                      {!shop.isActive && (
                        <Badge variant="neutral" className="ml-1">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(shop.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            toggleFeatured.mutate(shop.id, {
                              onSuccess: () => push(shop.isFeatured ? 'Removed from featured' : 'Marked as featured', 'success'),
                            })
                          }
                          className={clsx('btn btn-sm', shop.isFeatured ? 'bg-brand-100 text-brand-700' : 'text-ink-500 hover:bg-ink-100')}
                          aria-label={shop.isFeatured ? 'Unfeature' : 'Feature'}
                        >
                          <Star size={14} className={clsx(shop.isFeatured && 'fill-brand-600')} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleActive.mutate(shop.id, {
                              onSuccess: () => push(shop.isActive ? `${shop.name} suspended` : `${shop.name} reactivated`, 'success'),
                              onError: (err) => push((err as Error).message, 'error'),
                            })
                          }
                          className={clsx('btn btn-sm', shop.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50')}
                          aria-label={shop.isActive ? `Suspend ${shop.name}` : `Reactivate ${shop.name}`}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(shop)}
                          className="btn btn-sm text-ink-600 hover:bg-ink-100"
                          aria-label={`Edit ${shop.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => setReviewing(shop)} className="btn-secondary btn-sm">
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete "${shop.name}" from the platform?`)) {
                              deleteShop.mutate(shop.id, {
                                onSuccess: () => push(`${shop.name} deleted`, 'success'),
                                onError: (err) => push((err as Error).message, 'error'),
                              });
                            }
                          }}
                          className="btn btn-sm text-rose-600 hover:bg-rose-50"
                          aria-label={`Delete ${shop.name}`}
                          title="Delete shop"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.meta?.totalPages ?? 1} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={<Store className="size-8" />} title="No shops match this filter" />
      )}

      <VerifyModal shop={reviewing} onClose={() => setReviewing(null)} />
      <ShopEditModal shop={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/**
 * Admin-side shop editing. The list only carries an `AdminShop` (card-shaped),
 * so the full detail document is fetched by slug before the editor mounts —
 * the editor needs `pricing.items`, `offers` and `contact`, none of which are
 * on the card.
 *
 * Photos and opening hours reuse the owner dashboard's own components, so an
 * admin gets exactly the tools the owner has rather than a reduced copy.
 */
function ShopEditModal({ shop, onClose }: { shop: AdminShop | null; onClose: () => void }) {
  const { data: detail, isLoading } = useShop(shop?.slug ?? '');

  if (!shop) return null;

  return (
    <Modal open onClose={onClose} title={`Edit ${shop.name}`} size="lg">
      {isLoading || !detail ? (
        <LoadingBlock label="Loading shop…" />
      ) : (
        <div className="space-y-5">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            You are editing a shop you do not own. Every change is recorded in the audit log.
          </p>
          <ShopEditor shop={detail} />
          <PhotoManager shop={detail} />
          <HoursCard shop={detail} />
        </div>
      )}
    </Modal>
  );
}

function VerifyModal({ shop, onClose }: { shop: AdminShop | null; onClose: () => void }) {
  const verify = useVerifyShop();
  const push = useToasts((s) => s.push);
  const [reason, setReason] = useState('');

  if (!shop) return null;

  function act(status: 'verified' | 'rejected') {
    if (status === 'rejected' && reason.trim().length < 4) {
      push('Please give a reason so the owner can fix it', 'error');
      return;
    }
    verify.mutate(
      { id: shop!.id, status, rejectionReason: status === 'rejected' ? reason : undefined },
      {
        onSuccess: () => {
          push(status === 'verified' ? `${shop!.name} verified` : `${shop!.name} rejected`, 'success');
          setReason('');
          onClose();
        },
        onError: (err) => push((err as Error).message, 'error'),
      },
    );
  }

  return (
    <Modal open onClose={onClose} title={`Verify ${shop.name}`}>
      <dl className="space-y-2 text-sm">
        <Row label="Category" value={titleCase(shop.category)} />
        <Row label="Address" value={`${shop.location.address}, ${shop.location.city} — ${shop.location.pincode}`} />
        <Row label="Phone" value={`+91 ${shop.phone}`} />
        <Row label="Owner" value={shop.owner ? `${shop.owner.name} (${shop.owner.email})` : '—'} />
        <Row label="Price items" value={String(shop.itemCount)} />
        <Row label="Current status" value={titleCase(shop.verificationStatus.replace('_', ' '))} />
      </dl>

      <Link
        to={`/shop/${shop.slug}`}
        target="_blank"
        rel="noreferrer noopener"
        className="btn-secondary btn-sm mt-4 w-full"
      >
        Open public listing
      </Link>

      <div className="mt-5">
        <label htmlFor="reject-reason" className="label">
          Rejection reason <span className="font-normal text-ink-400">(required to reject)</span>
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. Address could not be verified against the submitted documents"
          className="input resize-none"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => act('rejected')} disabled={verify.isPending} className="btn btn-md flex-1 bg-rose-600 text-white hover:bg-rose-700">
          <XCircle size={16} aria-hidden />
          Reject
        </button>
        <button type="button" onClick={() => act('verified')} disabled={verify.isPending} className="btn btn-md flex-1 bg-emerald-600 text-white hover:bg-emerald-700">
          <CheckCircle2 size={16} aria-hidden />
          Verify
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-ink-800">{value}</dd>
    </div>
  );
}

function UsersTab() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading } = useAdminUsers({ page, role: role || undefined, q: debouncedSearch || undefined });
  const setStatus = useSetUserStatus();
  const setUserRole = useSetUserRole();
  const push = useToasts((s) => s.push);

  // Role changes are a super-admin power. Hiding the control is a UX courtesy
  // only — the API enforces it independently (admin.controller.ts setUserRole).
  const { user: me } = useAuth();
  const isSuperAdmin = me?.role === 'super_admin';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email or phone…"
            aria-label="Search users"
            className="input pl-10"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by role"
          className="input w-auto"
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="owner">Shop owners</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data?.items.length ? (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-800">
                        {[u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') || '—'}
                      </p>
                      <p className="text-xs text-ink-500">
                        {u.email} · +91 {u.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'customer' ? 'neutral' : u.role === 'owner' ? 'brand' : 'purple'}>
                        {titleCase(u.role.replace('_', ' '))}
                      </Badge>
                      {isSuperAdmin && u.id !== me?.id && u.role !== 'super_admin' && (
                        <select
                          value={u.role}
                          aria-label={`Change role for ${u.email}`}
                          className="input mt-1.5 w-auto py-1 text-xs"
                          onChange={(e) =>
                            setUserRole.mutate(
                              { id: u.id, role: e.target.value as UserRole },
                              {
                                onSuccess: () => push(`${u.email} is now ${titleCase(e.target.value)}`, 'success'),
                                onError: (err) => push((err as Error).message, 'error'),
                              },
                            )
                          }
                        >
                          <option value="customer">Customer</option>
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Suspended'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setStatus.mutate(
                            { id: u.id, isActive: !u.isActive },
                            {
                              onSuccess: () => push(u.isActive ? 'User suspended' : 'User reactivated', 'success'),
                              onError: (err) => push((err as Error).message, 'error'),
                            },
                          )
                        }
                        className={clsx('btn btn-sm', u.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50')}
                      >
                        <Ban size={14} aria-hidden />
                        {u.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.meta?.totalPages ?? 1} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={<Users className="size-8" />} title="No users match this filter" />
      )}
    </div>
  );
}

// --- Reviews -----------------------------------------------------------------

function ReviewsTab() {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState('');

  const { data, isLoading } = useAdminReviews({ page, rating: rating ? Number(rating) : undefined });
  const moderate = useModerateReview();
  const push = useToasts((s) => s.push);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={rating}
          onChange={(e) => {
            setRating(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by rating"
          className="input w-auto"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} star{r === 1 ? '' : 's'}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-500">Hiding a review recalculates the shop&apos;s rating immediately.</p>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data?.items.length ? (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Review</th>
                  <th className="px-4 py-3 font-semibold">Shop</th>
                  <th className="px-4 py-3 font-semibold">Author</th>
                  <th className="px-4 py-3 font-semibold">Posted</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((r) => (
                  <tr key={r._id} className="hover:bg-ink-50/60">
                    <td className="max-w-md px-4 py-3">
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-amber-600">{r.rating}★</span>
                        <span className="font-medium text-ink-800">{r.title || '—'}</span>
                      </p>
                      {r.comment && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{r.comment}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {r.shopId ? (
                        <Link to={`/shop/${r.shopId.slug}`} className="text-ink-700 hover:text-brand-600">
                          {r.shopId.basicInfo.name}
                        </Link>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{r.userId?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          moderate.mutate(
                            { id: r._id, isActive: !r.isActive },
                            {
                              onSuccess: () => push(r.isActive ? 'Review hidden' : 'Review restored', 'success'),
                              onError: (err) => push((err as Error).message, 'error'),
                            },
                          )
                        }
                        className={clsx(
                          'btn btn-sm',
                          r.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50',
                        )}
                      >
                        {r.isActive ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                        {r.isActive ? 'Hide' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.meta?.totalPages ?? 1} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon={<Star className="size-8" />} title="No reviews match this filter" />
      )}
    </div>
  );
}

// --- Categories --------------------------------------------------------------

function CategoriesTab() {
  const { data: categories = [], isLoading } = useAdminCategories();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  if (isLoading) return <LoadingBlock label="Loading categories…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500">
          Categories drive search filters, product catalog, and home page tiles. Slugs are generated from the name.
        </p>
        <button type="button" className="btn-primary btn-sm" onClick={() => setEditing('new')}>
          New category
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<LayoutGrid className="size-8" />} title="No categories yet" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Shops</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {categories.map((c) => (
                <tr key={c._id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-ink-800">
                      {c.color && (
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color }}
                          aria-hidden
                        />
                      )}
                      {c.name}
                    </span>
                    {c.description && <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{c.slug}</td>
                  <td className="px-4 py-3 text-ink-700">{c.stats?.activeShopCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="btn btn-sm text-ink-600 hover:bg-ink-100"
                        aria-label={`Edit ${c.name}`}
                        title="Edit category"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(c)}
                        className="btn btn-sm text-rose-600 hover:bg-rose-50"
                        aria-label={`Delete ${c.name}`}
                        title="Delete category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CategoryModal
        target={editing}
        onClose={() => setEditing(null)}
        onDelete={(cat) => setDeleting(cat)}
      />
      <DeleteCategoryModal
        category={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function DeleteCategoryModal({
  category,
  onClose,
}: {
  category: AdminCategory | null;
  onClose: () => void;
}) {
  const deleteCategory = useDeleteCategory();
  const push = useToasts((s) => s.push);
  const [permanent, setPermanent] = useState(false);

  useEffect(() => {
    if (category) {
      setPermanent(!category.isActive);
    }
  }, [category]);

  if (!category) return null;

  const shopCount = category.stats?.activeShopCount ?? 0;

  return (
    <Modal open onClose={onClose} title={`Delete Category: ${category.name}`} size="md">
      <div className="space-y-4">
        {shopCount > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Category is currently in use</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                There are <strong>{shopCount}</strong> active shop(s) listed under{' '}
                <strong className="text-amber-950">{category.name}</strong>.
                To maintain marketplace integrity, please reassign or delete those shops before deleting this category.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-ink-700">
            <p>
              Are you sure you want to delete <strong className="text-ink-900">{category.name}</strong>?
            </p>
            <p className="mt-1 text-xs text-ink-500">
              Slug: <code className="font-mono text-ink-700">{category.slug}</code> · Current Status:{' '}
              <span className={category.isActive ? 'text-emerald-700 font-medium' : 'text-ink-500 font-medium'}>
                {category.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        )}

        {shopCount === 0 && (
          <div>
            {category.isActive ? (
              <label className="flex items-start gap-2.5 text-xs text-ink-700 cursor-pointer rounded-lg border border-ink-200 p-3 hover:bg-ink-50/50">
                <input
                  type="checkbox"
                  checked={permanent}
                  onChange={(e) => setPermanent(e.target.checked)}
                  className="mt-0.5 rounded border-ink-300 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="font-semibold text-ink-900">Permanently delete from database</span>
                  <p className="text-ink-500 mt-0.5">
                    {permanent
                      ? 'The category record will be completely erased.'
                      : 'Deactivate category: hides it from public discovery while preserving admin records.'}
                  </p>
                </div>
              </label>
            ) : (
              <p className="text-xs text-ink-500">
                This category is currently inactive. Confirming will permanently remove it from the system.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={deleteCategory.isPending}>
            {shopCount > 0 ? 'Close' : 'Cancel'}
          </button>
          {shopCount === 0 && (
            <button
              type="button"
              onClick={() => {
                deleteCategory.mutate(
                  { id: category._id, permanent: category.isActive ? permanent : true },
                  {
                    onSuccess: () => {
                      push(
                        permanent || !category.isActive
                          ? `Category "${category.name}" permanently deleted`
                          : `Category "${category.name}" deactivated`,
                        'success',
                      );
                      onClose();
                    },
                    onError: (err) => push((err as Error).message, 'error'),
                  },
                );
              }}
              className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white font-medium inline-flex items-center gap-1.5"
              disabled={deleteCategory.isPending}
            >
              <Trash2 size={14} />
              {deleteCategory.isPending
                ? 'Deleting…'
                : permanent || !category.isActive
                  ? 'Delete permanently'
                  : 'Deactivate category'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CategoryModal({
  target,
  onClose,
  onDelete,
}: {
  target: AdminCategory | 'new' | null;
  onClose: () => void;
  onDelete?: (category: AdminCategory) => void;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const push = useToasts((s) => s.push);

  const existing = target === 'new' || target === null ? null : target;
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    icon: existing?.icon ?? '',
    color: existing?.color ?? '#6366f1',
    displayOrder: String(existing?.displayOrder ?? 0),
    isActive: existing?.isActive ?? true,
  });

  if (!target) return null;

  const payload = {
    name: form.name.trim(),
    description: form.description || undefined,
    icon: form.icon || undefined,
    color: form.color,
    displayOrder: Number(form.displayOrder) || 0,
    isActive: form.isActive,
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const onSuccess = () => {
      push(existing ? `${payload.name} updated` : `${payload.name} created`, 'success');
      onClose();
    };
    const onError = (err: unknown) => push((err as Error).message, 'error');

    if (existing) updateCategory.mutate({ id: existing._id, ...payload }, { onSuccess, onError });
    else createCategory.mutate(payload, { onSuccess, onError });
  }

  return (
    <Modal open onClose={onClose} title={existing ? `Edit ${existing.name}` : 'New category'}>
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <label htmlFor="cat-name" className="label">
            Name
          </label>
          <input
            id="cat-name"
            className="input"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="cat-description" className="label">
            Description
          </label>
          <textarea
            id="cat-description"
            rows={2}
            className="input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="cat-icon" className="label">
              Icon name
            </label>
            <input
              id="cat-icon"
              className="input"
              placeholder="scissors"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="cat-color" className="label">
              Colour
            </label>
            <input
              id="cat-color"
              type="color"
              className="input h-10 p-1"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="cat-order" className="label">
              Display order
            </label>
            <input
              id="cat-order"
              inputMode="numeric"
              className="input"
              value={form.displayOrder}
              onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value.replace(/\D/g, '') }))}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Active (visible in search and on the home page)
        </label>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-ink-100">
          {existing ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete?.(existing);
              }}
              className="btn btn-sm text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete category
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {existing ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// --- Analytics ---------------------------------------------------------------

function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminAnalytics(days);

  if (isLoading) return <LoadingBlock label="Loading analytics…" />;
  if (!data) return null;

  const eventTotals = data.events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + e.count;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink-900">Platform activity</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Time range"
          className="input w-auto"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['search', 'Searches'],
            ['shop_view', 'Shop views'],
            ['call_click', 'Call clicks'],
            ['direction_click', 'Directions'],
          ] as const
        ).map(([key, label]) => (
          <StatCard
            key={key}
            icon={<LineChart className="size-4" />}
            label={label}
            value={formatCount(eventTotals[key] ?? 0)}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="mb-1 text-sm font-semibold text-ink-900">Top searches</h3>
          <p className="mb-4 text-xs text-ink-500">Queries that found something.</p>
          {data.topQueries.length === 0 ? (
            <p className="text-sm text-ink-400">No searches recorded in this window.</p>
          ) : (
            <ul className="space-y-2">
              {data.topQueries.map((q) => (
                <li key={q.query} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-700">{q.query || '(blank)'}</span>
                  <span className="shrink-0 font-medium text-ink-500">{q.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* The most actionable list on the platform: demand with no supply. */}
        <section className="card border-amber-200 bg-amber-50/40 p-5">
          <h3 className="mb-1 text-sm font-semibold text-amber-900">Zero-result searches</h3>
          <p className="mb-4 text-xs text-amber-700">
            People looked for these and found nothing. This is your shop-acquisition list, in priority order.
          </p>
          {data.zeroResultQueries.length === 0 ? (
            <p className="text-sm text-amber-700">Nothing — every search returned results.</p>
          ) : (
            <ul className="space-y-2">
              {data.zeroResultQueries.map((q) => (
                <li key={q.query} className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    to={`/search?q=${encodeURIComponent(q.query ?? '')}`}
                    className="min-w-0 truncate font-medium text-amber-900 hover:underline"
                  >
                    {q.query || '(blank)'}
                  </Link>
                  <span className="shrink-0 font-medium text-amber-700">{q.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink-900">Shops by city</h3>
        {data.cityBreakdown.length === 0 ? (
          <p className="text-sm text-ink-400">No shops yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.cityBreakdown.map((c) => {
              const max = Math.max(...data.cityBreakdown.map((x) => x.shops), 1);
              return (
                <li key={c.city ?? 'unknown'} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate text-ink-600">{c.city || 'Unknown'}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.shops / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-medium text-ink-700">{c.shops}</span>
                  <span className="w-16 text-right text-xs text-ink-500">{formatCount(c.views)} views</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// --- Audit log ---------------------------------------------------------------

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'shop.verify': 'Shop verified / rejected',
  'shop.active': 'Shop suspended / restored',
  'shop.featured': 'Shop featured',
  'shop.update': 'Shop edited by admin',
  'shop.delete': 'Shop removed',
  'user.status': 'User suspended / restored',
  'user.role': 'User role changed',
  'review.moderate': 'Review moderated',
  'category.create': 'Category created',
  'category.update': 'Category updated',
  'category.delete': 'Category deactivated',
};

function AuditTab() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useAdminAuditLog({ page, action: action || undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by action"
          className="input w-auto"
        >
          <option value="">All actions</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-500">Every privileged write, newest first. Retained for one year.</p>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data?.items.length ? (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Who</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-ink-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-ink-700">{e.actorEmail}</p>
                      <p className="text-xs text-ink-400">{titleCase(e.actorRole.replace('_', ' '))}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{AUDIT_ACTION_LABELS[e.action] ?? e.action}</td>
                    <td className="px-4 py-3">
                      <p className="text-ink-700">{e.targetLabel || e.targetId}</p>
                      <p className="text-xs capitalize text-ink-400">{e.targetType}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-ink-500">
                      {e.reason ? (
                        <span className="italic">{e.reason}</span>
                      ) : (
                        <code className="break-words">{JSON.stringify(e.after ?? {})}</code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.meta?.totalPages ?? 1} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={<ScrollText className="size-8" />}
          title="No audit entries yet"
          description="Admin actions will appear here as they happen."
        />
      )}
    </div>
  );
}

function AiMarketInsightsTab() {
  const { data, isLoading } = useMarketplaceInsights();

  if (isLoading) return <LoadingBlock label="Analyzing Shopzy marketplace data…" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Disclaimer Alert */}
      <div className="rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/70 dark:bg-sky-950/30 p-4 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-3">
        <Sparkles className="size-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm text-sky-950 dark:text-sky-100">
            AI Citizen Marketplace Insights
          </h4>
          <p className="mt-1 leading-relaxed text-sky-800 dark:text-sky-300">
            {data.disclaimer}
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Bot className="size-4" />}
          label="Catalog Products Analyzed"
          value={formatCount(data.summary.totalProductsAnalyzed)}
          hint="From live shop price lists"
        />
        <StatCard
          icon={<Store className="size-4" />}
          label="Verified Local Shops"
          value={formatCount(data.summary.totalVerifiedShops)}
          hint={`${data.summary.totalActiveShops} active in Bhopal`}
        />
        <StatCard
          icon={<Scale className="size-4" />}
          label="Tracked Categories"
          value={formatCount(data.categoryPriceVariations.length)}
          hint="Across all city zones"
        />
        <StatCard
          icon={<Search className="size-4" />}
          label="Top Citizen Inquiries"
          value={formatCount(data.topSearchedKeywords.length)}
          hint="Natural language queries"
        />
      </div>

      {/* Price Variations by Category */}
      <div className="rounded-2xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <h3 className="text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
          <span>Category Price Variations & Spread</span>
        </h3>
        <p className="mt-1 text-xs text-ink-500 dark:text-slate-400">
          Distribution of minimum, maximum, and average listed prices across Bhopal local shops.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-100 dark:border-slate-800 text-ink-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Items Tracked</th>
                <th className="py-2.5 px-3 text-right">Lowest Listed Price</th>
                <th className="py-2.5 px-3 text-right">Highest Listed Price</th>
                <th className="py-2.5 px-3 text-right">Average Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-slate-800">
              {data.categoryPriceVariations.map((cat) => (
                <tr key={cat.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-semibold capitalize text-ink-900 dark:text-white">
                    {titleCase(cat.category)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-ink-600 dark:text-slate-300">
                    {cat.itemCount} items
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(cat.minPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-ink-700 dark:text-slate-300">
                    {formatINR(cat.maxPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-brand-600 dark:text-brand-400">
                    {formatINR(cat.avgPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Search Demands */}
      <div className="rounded-2xl border border-ink-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <h3 className="text-base font-bold text-ink-900 dark:text-white">
          Most Searched Citizen Products & Requirements
        </h3>
        <p className="mt-1 text-xs text-ink-500 dark:text-slate-400">
          Aggregated search demand patterns helping local merchants identify catalog gaps.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {data.topSearchedKeywords.map((item) => (
            <div
              key={item.keyword}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-center"
            >
              <span className="block text-xs font-semibold capitalize text-slate-800 dark:text-white truncate">
                {item.keyword}
              </span>
              <span className="mt-1 inline-block rounded-full bg-sky-100 dark:bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                {item.searches} inquiries
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

