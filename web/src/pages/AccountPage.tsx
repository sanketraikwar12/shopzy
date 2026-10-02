import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  User as UserIcon,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShopCard } from '@/components/ShopCard';
import { api, ApiError } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { useDocumentMeta } from '@/lib/hooks';
import { useMyShops, useSavedShops } from '@/lib/queries';
import { useAuth, useToasts } from '@/store';

type TabId =
  | 'profile'
  | 'business'
  | 'orders'
  | 'listings'
  | 'analytics'
  | 'settings'
  | 'addresses'
  | 'saved'
  | 'notifications'
  | 'security'
  | 'payments';

interface TabItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function AccountPage() {
  const { user, logout, setUser } = useAuth();
  const push = useToasts((s) => s.push);
  const navigate = useNavigate();

  const isOwner = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'super_admin';

  useDocumentMeta(
    isOwner ? 'My Account — Business & Profile | SHOPZY' : 'My Account | SHOPZY',
    isOwner
      ? 'Manage your profile, business settings and data — all in one place.'
      : 'Manage your SHOPZY profile, preferences and local shopping data.',
  );

  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit Profile Form State
  const [editFirstName, setEditFirstName] = useState(user?.profile?.firstName || '');
  const [editLastName, setEditLastName] = useState(user?.profile?.lastName || '');
  const [editBio, setEditBio] = useState(user?.profile?.bio || (isOwner ? 'Studio Owner Account' : 'Exploring local. Supporting community. 💙'));
  const [editAvatar, setEditAvatar] = useState(user?.profile?.avatar || '');
  const [editPending, setEditPending] = useState(false);

  // Phone Verification State
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [otpPending, setOtpPending] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Password Change State (under Security tab)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [securityPending, setSecurityPending] = useState(false);

  // Queries
  const savedShopsQuery = useSavedShops();
  const myShopsQuery = useMyShops();

  if (!user) return <Navigate to="/login" replace />;

  const fullName =
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    (isOwner ? 'Studio Owner' : 'Shopzy Customer');

  const roleLabel =
    user.role === 'customer'
      ? 'Customer'
      : user.role === 'owner'
        ? 'Owner'
        : user.role === 'super_admin'
          ? 'Super Admin'
          : 'Admin';

  // Tabs configured specifically according to the user's reference mockup:
  // For Owner: Profile, Business, Orders, Listings, Analytics, Settings, Security
  // For Customer: Profile, Addresses, Orders, Saved, Notifications, Security, Payments
  const ownerTabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'business', label: 'Business', icon: Store, badge: myShopsQuery.data?.length },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'listings', label: 'Listings', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const customerTabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'saved', label: 'Saved', icon: Heart, badge: user.savedShops?.length || 0 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  const tabs = isOwner ? ownerTabs : customerTabs;

  async function handleExportData() {
    try {
      const res = await api.get<unknown>('/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shopzy-data-${user!.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      push('Your personal data archive has been downloaded', 'success');
    } catch {
      push('Could not export your data right now', 'error');
    }
  }

  async function handleDeleteAccount() {
    try {
      await api.del('/me/account');
      await logout();
      push('Your account and personal data have been permanently erased', 'success');
      navigate('/');
    } catch {
      push('Could not delete account. Please try again.', 'error');
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditPending(true);
    try {
      const res = await api.put<typeof user>('/auth/me', {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        bio: editBio.trim(),
        avatar: editAvatar.trim() || undefined,
      });
      setUser(res.data);
      push('Profile updated successfully', 'success');
      setEditOpen(false);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to update profile', 'error');
    } finally {
      setEditPending(false);
    }
  }

  async function handleStartPhoneVerify() {
    setVerifyOpen(true);
    setVerifyError('');
    setOtpPending(true);
    try {
      const res = await api.post<{ message: string; expiresIn: number; devCode?: string }>('/auth/otp/request', {
        phone: user!.phone,
        purpose: 'verify_phone',
      });
      if (res.data.devCode) {
        setDevCode(res.data.devCode);
        setOtpCode(res.data.devCode);
      }
      push('Verification code sent to your phone', 'info');
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : 'Could not send verification code');
    } finally {
      setOtpPending(false);
    }
  }

  async function handleConfirmPhoneVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setOtpPending(true);
    setVerifyError('');
    try {
      await api.post('/auth/verify-phone', {
        phone: user!.phone,
        code: otpCode.trim(),
        purpose: 'verify_phone',
      });
      setUser({ ...user!, isPhoneVerified: true, isVerified: true });
      push('Phone number verified successfully! ✔', 'success');
      setVerifyOpen(false);
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : 'Invalid or expired verification code');
    } finally {
      setOtpPending(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSecurityPending(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      push('Password changed successfully. Other sessions logged out.', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to change password', 'error');
    } finally {
      setSecurityPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header & Hand-Crafted Slogan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Account</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isOwner
              ? 'Manage your profile, business settings and data — all in one place.'
              : 'Manage your profile, preferences and data — all in one place.'}
          </p>
        </div>

        {/* Brand Slogan Badge */}
        <div className="hidden sm:flex items-center gap-2 select-none pr-4">
          <div className="relative text-right -rotate-2">
            <span className="block font-handwriting text-2xl sm:text-3xl font-bold tracking-wide text-blue-600 dark:text-blue-400 leading-none">
              {isOwner ? 'Local Businesses' : 'Shop Local'}
            </span>
            <span className="block font-handwriting text-2xl sm:text-3xl font-bold tracking-wide text-blue-600 dark:text-blue-400 leading-none mt-0.5">
              {isOwner ? 'Stronger Communities' : 'Live Better'}
            </span>
            {/* Dynamic decorative underline arc */}
            <svg
              className="absolute -bottom-2.5 right-0 w-32 h-3 text-blue-500 dark:text-blue-400"
              viewBox="0 0 120 12"
              fill="none"
            >
              <path d="M4 8C35 1 85 2 116 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Sidebar + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Left Column: Sidebar Card */}
        <aside className="space-y-5">
          {/* Main Sidebar Card */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs space-y-3">
            {/* Mini Profile Header (Shown in Owner reference design) */}
            {isOwner && (
              <div className="flex items-center gap-3 px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="size-11 rounded-full bg-slate-900 dark:bg-slate-800 text-white font-bold text-base grid place-items-center shrink-0 shadow-xs">
                  {initials(fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-bold text-slate-900 dark:text-white truncate">
                    {fullName}
                  </strong>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                    Owner Account
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0" aria-label="Account sections">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} aria-hidden />
                      {tab.label}
                    </span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Card: Either "Grow Your Business with Shopzy" (for Owner) or "Support Local Storefront" (for Customer) */}
          {isOwner ? (
            /* Owner Business Promo Card */
            <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-b from-[#03152d] via-[#051c3d] to-[#072552] p-5 text-white shadow-md relative overflow-hidden">
              {/* Subtle background glow effect */}
              <div className="absolute -right-8 -bottom-8 size-28 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

              <div className="size-10 rounded-xl bg-blue-500/20 border border-blue-400/20 text-blue-400 grid place-items-center mb-3.5">
                <Store size={20} aria-hidden />
              </div>

              <h2 className="text-sm font-bold tracking-tight text-white leading-snug">
                Grow Your Business with Shopzy
              </h2>
              <p className="mt-1.5 text-xs text-slate-300/80 leading-relaxed">
                Reach more local customers and be a part of a stronger community.
              </p>

              <Link
                to="/owner"
                className="mt-4 inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-white hover:bg-slate-100 text-[#03152d] px-3.5 py-2 text-xs font-bold transition-all shadow-xs group"
              >
                <span>View My Business</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          ) : (
            /* Customer Community Storefront Card */
            <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-gradient-to-b from-blue-50/80 via-sky-50/30 to-white dark:from-slate-800/70 dark:via-slate-800/40 dark:to-slate-900 p-6 text-center shadow-xs">
              <div className="mx-auto w-36 h-28 relative flex items-center justify-center">
                <svg viewBox="0 0 160 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="80" cy="115" rx="75" ry="35" fill="#e0f2fe" opacity="0.6" />
                  <circle cx="28" cy="35" r="10" fill="#ffffff" />
                  <circle cx="38" cy="32" r="14" fill="#ffffff" />
                  <circle cx="50" cy="35" r="9" fill="#ffffff" />
                  <circle cx="120" cy="32" r="8" fill="#ffffff" />
                  <circle cx="130" cy="28" r="12" fill="#ffffff" />

                  <rect x="35" y="55" width="90" height="52" rx="4" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.5" />
                  <path d="M30 55 L34 42 L126 42 L130 55 Z" fill="#2563eb" />
                  <path d="M48 42 L46 55 L64 55 L62 42 Z" fill="#60a5fa" />
                  <path d="M80 42 L78 55 L96 55 L94 42 Z" fill="#60a5fa" />
                  <path d="M112 42 L110 55 L126 55 L123 42 Z" fill="#60a5fa" />

                  <circle cx="38" cy="55" r="4" fill="#2563eb" />
                  <circle cx="55" cy="55" r="4" fill="#60a5fa" />
                  <circle cx="71" cy="55" r="4" fill="#2563eb" />
                  <circle cx="87" cy="55" r="4" fill="#60a5fa" />
                  <circle cx="103" cy="55" r="4" fill="#2563eb" />
                  <circle cx="122" cy="55" r="4" fill="#60a5fa" />

                  <rect x="42" y="66" width="22" height="24" rx="2" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1" />
                  <rect x="96" y="66" width="22" height="24" rx="2" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1" />
                  <rect x="71" y="68" width="18" height="38" rx="2" fill="#2563eb" />
                  <circle cx="74" cy="87" r="1.5" fill="#ffffff" />

                  <rect x="22" y="94" width="8" height="12" rx="2" fill="#f97316" />
                  <ellipse cx="26" cy="88" rx="7" ry="10" fill="#10b981" />
                  <rect x="130" y="94" width="8" height="12" rx="2" fill="#f97316" />
                  <ellipse cx="134" cy="88" rx="7" ry="10" fill="#10b981" />

                  <circle cx="80" cy="22" r="14" fill="#0284c7" />
                  <path
                    d="M80 13a5.5 5.5 0 0 0-5.5 5.5c0 4.2 5.5 9.5 5.5 9.5s5.5-5.3 5.5-9.5A5.5 5.5 0 0 0 80 13z"
                    fill="#ffffff"
                  />
                  <circle cx="80" cy="18.5" r="2" fill="#0284c7" />
                </svg>
              </div>

              <div className="mt-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Shop Local
                </span>
                <strong className="block text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  Support Local
                </strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Build a Better Tomorrow
                </p>
                <svg className="mx-auto w-24 h-2.5 text-blue-500 mt-2" viewBox="0 0 100 12" fill="none">
                  <path d="M2 3C30 11 70 11 98 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )}
        </aside>

        {/* Right Content Area */}
        <main className="space-y-6">
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <>
              {/* Card 1: Profile & Account Information Card */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs">
                {/* Profile Header Box */}
                <div className="rounded-2xl bg-blue-50/60 dark:bg-slate-800/50 border border-blue-100/60 dark:border-slate-700/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar with Store badge overlay for owner, or camera for customer */}
                    <div className="relative shrink-0">
                      {user.profile?.avatar ? (
                        <img
                          src={user.profile.avatar}
                          alt={fullName}
                          className="size-16 sm:size-18 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                        />
                      ) : (
                        <div className="size-16 sm:size-18 rounded-full bg-slate-900 dark:bg-slate-800 text-white font-bold text-2xl grid place-items-center border-2 border-white dark:border-slate-800 shadow-sm">
                          {initials(fullName)}
                        </div>
                      )}

                      {isOwner ? (
                        /* Small blue storefront icon badge overlapping on bottom-right as in owner reference */
                        <div
                          title="Verified Owner"
                          className="absolute -bottom-1 -right-1 size-6 sm:size-7 rounded-full bg-blue-600 text-white grid place-items-center border-2 border-white dark:border-slate-900 shadow-xs"
                        >
                          <Store size={13} aria-hidden />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditOpen(true)}
                          title="Change photo"
                          className="absolute -bottom-1 -right-1 size-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white grid place-items-center border-2 border-white dark:border-slate-900 shadow-xs transition-transform hover:scale-110"
                        >
                          <Camera size={13} aria-hidden />
                        </button>
                      )}
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {fullName}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-0.5">
                          {roleLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditFirstName(user.profile?.firstName || '');
                      setEditLastName(user.profile?.lastName || '');
                      setEditBio(user.profile?.bio || (isOwner ? 'Studio Owner Account' : 'Exploring local. Supporting community. 💙'));
                      setEditAvatar(user.profile?.avatar || '');
                      setEditOpen(true);
                    }}
                    className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition-colors"
                  >
                    <Pencil size={14} className="text-slate-500" aria-hidden />
                    Edit Profile
                  </button>
                </div>

                {/* Owner 2-Column Information Layout (Faithful to media_1789811678637.png) */}
                {isOwner ? (
                  <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 border-t border-slate-100 dark:border-slate-800 pt-6">
                    {/* Column 1 */}
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="flex items-center gap-3.5">
                        <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                          <UserIcon size={17} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between sm:justify-start gap-6">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-20 shrink-0">Name</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{fullName}</span>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-3.5">
                        <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                          <Mail size={17} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between sm:justify-start gap-6">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-20 shrink-0">Email</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white font-mono break-all">{user.email}</span>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-3.5">
                        <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                          <Phone size={17} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between sm:justify-start gap-6">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-20 shrink-0">Phone</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white font-mono">+91 {user.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-4">
                      {/* Role */}
                      <div className="flex items-center gap-3.5">
                        <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                          <Users size={17} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between sm:justify-start gap-6">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0">Role</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{roleLabel}</span>
                        </div>
                      </div>

                      {/* Phone verified */}
                      <div className="flex items-center gap-3.5">
                        <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                          <ShieldCheck size={17} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between sm:justify-start gap-6">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0">Phone verified</span>
                          {user.isPhoneVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold">
                              <CheckCircle2 size={12} aria-hidden /> Yes
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-700 px-2.5 py-0.5 text-xs font-semibold">
                                Not yet
                              </span>
                              <button
                                type="button"
                                onClick={handleStartPhoneVerify}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                              >
                                Verify
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Member since */}
                      <div className="flex items-center gap-3.5">
                        <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                          <Calendar size={17} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between sm:justify-start gap-6">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0">Member since</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Customer Single-List Information Layout */
                  <div className="mt-7">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Personal Information</h3>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                        <div className="flex items-center gap-3 sm:w-60">
                          <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                            <UserIcon size={17} aria-hidden />
                          </div>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Full Name</span>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 pl-12 sm:pl-0">
                          {fullName}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                        <div className="flex items-center gap-3 sm:w-60">
                          <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                            <Mail size={17} aria-hidden />
                          </div>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 pl-12 sm:pl-0">
                          <span className="text-sm font-medium text-slate-900 dark:text-white font-mono break-all">
                            {user.email}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold">
                            <CheckCircle2 size={12} aria-hidden /> Verified
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                        <div className="flex items-center gap-3 sm:w-60">
                          <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                            <Phone size={17} aria-hidden />
                          </div>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Phone Number</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 pl-12 sm:pl-0">
                          <span className="text-sm font-medium text-slate-900 dark:text-white font-mono">
                            +91 {user.phone}
                          </span>
                          {user.isPhoneVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold">
                              <CheckCircle2 size={12} aria-hidden /> Verified
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-700 px-2.5 py-0.5 text-xs font-semibold">
                                <AlertTriangle size={12} aria-hidden /> Not Verified
                              </span>
                              <button
                                type="button"
                                onClick={handleStartPhoneVerify}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                              >
                                Verify Now
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                        <div className="flex items-center gap-3 sm:w-60">
                          <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                            <Users size={17} aria-hidden />
                          </div>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Account Role</span>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 pl-12 sm:pl-0">
                          {roleLabel}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                        <div className="flex items-center gap-3 sm:w-60">
                          <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-500 shrink-0">
                            <Calendar size={17} aria-hidden />
                          </div>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Member Since</span>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 pl-12 sm:pl-0">
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Your data (DPDP Act Compliance) */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="size-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                    <Shield size={22} aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Your data</h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Under the Digital Personal Data Protection Act you can export or permanently erase everything we hold about you.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="flex items-center gap-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs group"
                  >
                    <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
                      <Download size={18} aria-hidden />
                    </div>
                    <div>
                      <strong className="block text-sm font-bold text-slate-900 dark:text-white">Export my data</strong>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Get a copy of your data</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="flex items-center gap-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-4 text-left hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition-colors shadow-2xs group"
                  >
                    <div className="size-10 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
                      <Trash2 size={18} aria-hidden />
                    </div>
                    <div>
                      <strong className="block text-sm font-bold text-rose-700 dark:text-rose-400">Delete my account</strong>
                      <span className="block text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Permanently remove your data</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Card 3: Sign out Card */}
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  push('Signed out successfully', 'success');
                  navigate('/');
                }}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 grid place-items-center shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                    <LogOut size={18} aria-hidden />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900 dark:text-white">Sign out</strong>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">End your session on this device</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </button>
            </>
          )}

          {/* TAB: BUSINESS (Owner's Registered Shops & Manager Shortcut) */}
          {activeTab === 'business' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Business Listings</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage store profile, working hours, catalog, and verification status.
                  </p>
                </div>
                <Link to="/owner" className="btn-primary btn-sm inline-flex items-center gap-1.5">
                  <span>Dashboard</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {myShopsQuery.isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : myShopsQuery.data && myShopsQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {myShopsQuery.data.map((shop) => (
                    <div
                      key={shop.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="size-14 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                          <Store size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{shop.name}</h3>
                            <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-semibold px-2 py-0.5">
                              {shop.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {shop.location.address || `${shop.location.city}, ${shop.location.state}`}
                          </p>
                          <span className="inline-block mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            ● Active on SHOPZY Discovery
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        <Link to={`/shop/${shop.slug}`} className="btn-secondary btn-sm">
                          View Live
                        </Link>
                        <Link to="/owner" className="btn-primary btn-sm">
                          Manage
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                  <Store size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No registered businesses yet</p>
                  <p className="text-xs text-slate-500 mt-1">List your local shop to reach thousands of nearby customers.</p>
                  <Link to="/owner" className="btn-primary btn-sm mt-4 inline-flex">
                    Register Your Business
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB: ORDERS / INQUIRIES */}
          {activeTab === 'orders' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Orders & Inquiries</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Incoming customer leads, price checks, and pickup requests for your stores.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                <ShoppingBag size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No pending inquiries</p>
                <p className="text-xs text-slate-500 mt-1">
                  Customer click-to-call and direction requests are routed directly to your business phone.
                </p>
              </div>
            </div>
          )}

          {/* TAB: LISTINGS */}
          {activeTab === 'listings' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Catalog & Price Listings</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage price tags, items, discounts, and photo gallery.
                  </p>
                </div>
                <Link to="/owner" className="btn-primary btn-sm">
                  Add Item
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900 dark:text-white">Full Catalog Editor</strong>
                    <span className="block text-xs text-slate-500">Update item price ranges and deals in real-time</span>
                  </div>
                </div>
                <Link to="/owner" className="btn-secondary btn-sm">
                  Open Catalog
                </Link>
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Store Analytics & Reach</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Real-time visibility metrics across local search in Bhopal.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Shop Views', val: '1,420+' },
                  { label: 'Call Clicks', val: '184' },
                  { label: 'Directions', val: '96' },
                  { label: 'Search Saves', val: '48' },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.label}</span>
                    <strong className="block text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                      {stat.val}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Link to="/owner" className="btn-secondary btn-sm inline-flex items-center gap-1.5">
                  <span>Detailed Analytics</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Business Settings</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Configure alerts, operating status, and customer contact preferences.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                {[
                  { title: 'New Customer Lead Alerts', desc: 'Instant SMS & push notifications when users view your phone number', checked: true },
                  { title: 'Review Notifications', desc: 'Get alerted when a verified customer leaves feedback', checked: true },
                  { title: 'Weekly Performance Digest', desc: 'Email summary of search impressions and competitor pricing', checked: true },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    <div>
                      <strong className="block text-sm font-bold text-slate-900 dark:text-white">{item.title}</strong>
                      <span className="block text-xs text-slate-500 mt-0.5">{item.desc}</span>
                    </div>
                    <input type="checkbox" defaultChecked={item.checked} className="size-4 accent-blue-600 rounded" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SECURITY */}
          {activeTab === 'security' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Password</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Keep your account secure by updating your password periodically.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <div>
                  <label className="label" htmlFor="currentPass">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPass"
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="input pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="newPass">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPass"
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="input pr-10"
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={securityPending} className="btn-primary btn-md">
                  {securityPending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {securityPending ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* TAB: SAVED SHOPS (Customer View) */}
          {activeTab === 'saved' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Shops</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Your bookmarked local stores for quick reference and price checks.
                  </p>
                </div>
                <Link to="/search" className="btn-secondary btn-sm">
                  Explore More
                </Link>
              </div>

              {savedShopsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : savedShopsQuery.data && savedShopsQuery.data.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedShopsQuery.data.map((shop) => (
                    <ShopCard key={shop.id} shop={shop} isSaved />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                  <Heart size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No saved shops yet</p>
                  <p className="text-xs text-slate-500 mt-1">Tap the heart icon on any shop to save it here.</p>
                  <Link to="/search" className="btn-primary btn-sm mt-4 inline-flex">
                    Discover local shops
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB: ADDRESSES (Customer View) */}
          {activeTab === 'addresses' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Addresses</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Manage your locations to find nearby local stores and accurate distance calculations.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900 dark:text-white">Default Area</strong>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {user.location?.address || `${user.location?.city || 'Bhopal'}, Madhya Pradesh`}
                    </p>
                    <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5 mt-2">
                      Active Search Center
                    </span>
                  </div>
                </div>
                <Link to="/search" className="btn-secondary btn-sm">
                  Change Location
                </Link>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS (Customer View) */}
          {activeTab === 'notifications' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Choose what updates you want to receive about local deals and shop announcements.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'New Local Offers', desc: 'Alerts when your favorite shops announce seasonal discounts', checked: true },
                  { title: 'Price Drop Alerts', desc: 'Real-time updates when an item you compared drops in price', checked: true },
                  { title: 'Community Reviews', desc: 'Helpful feedback replies on your verified local reviews', checked: false },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    <div>
                      <strong className="block text-sm font-bold text-slate-900 dark:text-white">{item.title}</strong>
                      <span className="block text-xs text-slate-500 mt-0.5">{item.desc}</span>
                    </div>
                    <input type="checkbox" defaultChecked={item.checked} className="size-4 accent-blue-600 rounded" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PAYMENTS (Customer View) */}
          {activeTab === 'payments' && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Methods</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  SHOPZY enables direct in-store payments via UPI QR, Cash on Delivery, and merchant digital billing.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 grid place-items-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900 dark:text-white">Direct Local Pay (UPI & COD)</strong>
                    <span className="block text-xs text-slate-500">Pay directly to store owners without intermediary platform commissions</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                  Zero Fees
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Edit Profile */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="size-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 grid place-items-center"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="editFirst">
                    First Name
                  </label>
                  <input
                    id="editFirst"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    className="input"
                    placeholder="Studio"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="editLast">
                    Last Name
                  </label>
                  <input
                    id="editLast"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="input"
                    placeholder="Owner"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="editBio">
                  Bio / Tagline
                </label>
                <input
                  id="editBio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={180}
                  className="input"
                  placeholder={isOwner ? 'Studio Owner Account' : 'Exploring local. Supporting community. 💙'}
                />
                <span className="text-[11px] text-slate-400 mt-1 block text-right">{editBio.length}/180</span>
              </div>

              <div>
                <label className="label" htmlFor="editAvatar">
                  Avatar Image URL (Optional)
                </label>
                <input
                  id="editAvatar"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary btn-md">
                  Cancel
                </button>
                <button type="submit" disabled={editPending} className="btn-primary btn-md">
                  {editPending && <Loader2 size={16} className="animate-spin" />}
                  {editPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Phone Verification (OTP) */}
      {verifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Verify Phone Number</h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyOpen(false)}
                className="size-7 rounded-lg text-slate-400 hover:text-slate-600 grid place-items-center"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We sent a 6-digit verification code to <strong className="font-mono text-slate-900 dark:text-white">+91 {user.phone}</strong>.
            </p>

            {devCode && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/50 p-2.5 text-xs text-blue-800 dark:text-blue-300">
                <span>Demo OTP Code: <strong className="font-mono font-bold">{devCode}</strong></span>
              </div>
            )}

            {verifyError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleConfirmPhoneVerify} className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="otpCodeInput">
                  Enter 6-digit code
                </label>
                <input
                  id="otpCodeInput"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                  className="input text-center font-mono text-lg tracking-widest"
                  placeholder="123456"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleStartPhoneVerify}
                  disabled={otpPending}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  Resend OTP
                </button>
                <button type="submit" disabled={otpPending || otpCode.length < 6} className="btn-primary btn-md">
                  {otpPending && <Loader2 size={15} className="animate-spin" />}
                  {otpPending ? 'Verifying…' : 'Verify Phone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Account Confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 grid place-items-center">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete SHOPZY Account?</h3>
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This action is permanent under the Digital Personal Data Protection Act. All your listings, reviews, bookmarks, and account data will be completely deleted from our databases.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteOpen(false)} className="btn-secondary btn-md">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="btn btn-md bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
