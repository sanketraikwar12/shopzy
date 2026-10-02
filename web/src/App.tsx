import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LoadingBlock } from '@/components/ui';
import { getAccessToken, setUnauthorizedHandler } from '@/lib/api';
import { HomePage } from '@/pages/HomePage';
import { useAuth, useToasts } from '@/store';

// Route-level code splitting: secondary and authenticated screens are only
// downloaded on-demand when navigated to.
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const ShopDetailPage = lazy(() => import('@/pages/ShopDetailPage').then((m) => ({ default: m.ShopDetailPage })));
const ComparePage = lazy(() => import('@/pages/ComparePage').then((m) => ({ default: m.ComparePage })));
const OwnerDashboardPage = lazy(() =>
  import('@/pages/OwnerDashboardPage').then((m) => ({ default: m.OwnerDashboardPage })),
);
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));

const LoginPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.ResetPasswordPage })));

const AccountPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.AccountPage })));
const AboutPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.AboutPage })));
const BlogPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.BlogPage })));
const CategoriesPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.CategoriesPage })));
const TouristPlacesPage = lazy(() =>
  import('@/pages/TouristPlacesPage').then((m) => ({ default: m.TouristPlacesPage })),
);
const TouristDetailPage = lazy(() =>
  import('@/pages/TouristDetailPage').then((m) => ({ default: m.TouristDetailPage })),
);
const SavedShopsPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.SavedShopsPage })));
const PrivacyPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('@/pages/MiscPages').then((m) => ({ default: m.NotFoundPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry client errors — only transient network/server failures.
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

/** Blocks a route unless the signed-in user has one of the allowed roles. */
function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, status } = useAuth();

  if (status === 'idle' || status === 'loading') return <LoadingBlock />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

/** Restores the session once at startup and wires the global 401 handler. */
function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const { hydrate, setUser, status } = useAuth();
  const navigate = useNavigate();
  const push = useToasts((s) => s.push);

  useEffect(() => {
    if (getAccessToken()) void hydrate();
    else setUser(null);
  }, [hydrate, setUser]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      queryClient.clear();
      push('Your session expired. Please sign in again.', 'info');
      navigate('/login');
    });
  }, [navigate, push, setUser]);

  if (status === 'idle') return <LoadingBlock />;

  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionBootstrap>
          <Suspense fallback={<LoadingBlock />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="deals" element={<SearchPage />} />
                <Route path="shop/:slug" element={<ShopDetailPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="tourist-places" element={<TouristPlacesPage />} />
                <Route path="tourist-places/:slug" element={<TouristDetailPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="blog" element={<BlogPage />} />

                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />

                <Route path="terms" element={<TermsPage />} />
                <Route path="privacy" element={<PrivacyPage />} />

                <Route path="saved" element={<SavedShopsPage />} />
                <Route path="account" element={<AccountPage />} />

                <Route
                  path="owner"
                  element={
                    <RequireRole roles={['owner', 'admin', 'super_admin']}>
                      <OwnerDashboardPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <RequireRole roles={['admin', 'super_admin']}>
                      <AdminPage />
                    </RequireRole>
                  }
                />

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </SessionBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
