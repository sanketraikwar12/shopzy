import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store';
import type {
  AdminCategory,
  AdminDashboard,
  AdminReview,
  AdminShop,
  AdminUser,
  AuditEntry,
  Category,
  CategoryInput,
  PageMeta,
  PlatformAnalytics,
  PriceComparisonRow,
  Review,
  SearchFacets,
  SearchParams,
  ShopAnalytics,
  ShopCard,
  ShopDetail,
  ShopPhoto,
  Suggestion,
  UserRole,
} from '@/types';

export const queryKeys = {
  categories: ['categories'] as const,
  category: (slug: string) => ['category', slug] as const,
  search: (params: SearchParams) => ['search', params] as const,
  suggest: (q: string, city?: string) => ['suggest', q, city] as const,
  trending: ['trending'] as const,
  // Coords are part of the key because the API returns a coord-dependent
  // `distanceKm`; without them a location change served a stale distance.
  shop: (slug: string, coords?: { lat: number; lng: number } | null) =>
    ['shop', slug, coords?.lat ?? null, coords?.lng ?? null] as const,
  /** Prefix matching every cached variant of a shop, for invalidation. */
  shopRoot: (slug: string) => ['shop', slug] as const,
  similar: (slug: string) => ['similar', slug] as const,
  reviews: (shopId: string, page: number, sort: string) => ['reviews', shopId, page, sort] as const,
  compare: (item: string, radius: number, lat?: number, lng?: number) =>
    ['compare', item, radius, lat, lng] as const,
  saved: ['saved-shops'] as const,
  myShops: ['my-shops'] as const,
  shopAnalytics: (id: string) => ['shop-analytics', id] as const,
  adminDashboard: ['admin', 'dashboard'] as const,
  adminShops: (params: Record<string, unknown>) => ['admin', 'shops', params] as const,
  adminUsers: (params: Record<string, unknown>) => ['admin', 'users', params] as const,
  adminReviews: (params: Record<string, unknown>) => ['admin', 'reviews', params] as const,
  adminAnalytics: (days: number) => ['admin', 'analytics', days] as const,
  adminCategories: ['admin', 'categories'] as const,
  adminAudit: (params: Record<string, unknown>) => ['admin', 'audit', params] as const,
};

// --- Discovery ---------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
    staleTime: 30 * 60 * 1000, // categories rarely change
  });
}

export function useSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.search(params),
    queryFn: async () => {
      const res = await api.get<ShopCard[]>('/shops', params as Record<string, unknown>);
      return {
        items: res.data,
        meta: res.meta as PageMeta & { facets: SearchFacets; tookMs: number },
      };
    },
    enabled,
    // Keeps the previous page rendered while the next one loads — no layout flash.
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useSuggestions(q: string, city?: string) {
  return useQuery({
    queryKey: queryKeys.suggest(q, city),
    queryFn: async () => (await api.get<Suggestion[]>('/shops/suggest', { q, city })).data,
    enabled: q.trim().length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: queryKeys.trending,
    queryFn: async () => (await api.get<Array<{ query: string; count: number }>>('/shops/trending')).data,
    staleTime: 10 * 60 * 1000,
  });
}

export function useShop(slug: string, coords?: { lat: number; lng: number } | null) {
  return useQuery({
    queryKey: queryKeys.shop(slug, coords),
    queryFn: async () =>
      (await api.get<ShopDetail>(`/shops/${slug}`, coords ? { lat: coords.lat, lng: coords.lng } : undefined)).data,
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSimilarShops(slug: string) {
  return useQuery({
    queryKey: queryKeys.similar(slug),
    queryFn: async () => (await api.get<ShopCard[]>(`/shops/${slug}/similar`)).data,
    enabled: Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePriceComparison(item: string, coords?: { lat: number; lng: number } | null, radius = 10) {
  return useQuery({
    queryKey: queryKeys.compare(item, radius, coords?.lat, coords?.lng),
    queryFn: async () => {
      const res = await api.get<PriceComparisonRow[]>('/shops/compare', {
        item,
        radius,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      return { rows: res.data, stats: res.meta?.stats as { min: number; max: number; avg: number; count: number } };
    },
    enabled: item.trim().length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}

// --- Reviews -----------------------------------------------------------------

export function useReviews(shopId: string | undefined, page: number, sort: string) {
  return useQuery({
    queryKey: queryKeys.reviews(shopId ?? '', page, sort),
    queryFn: async () => {
      const res = await api.get<Review[]>(`/shops/${shopId}/reviews`, { page, sort, limit: 10 });
      return { items: res.data, meta: res.meta as PageMeta };
    },
    enabled: Boolean(shopId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateReview(shopId: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rating: number; title?: string; comment?: string }) =>
      (await api.post(`/shops/${shopId}/reviews`, input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', shopId] });
      void qc.invalidateQueries({ queryKey: queryKeys.shopRoot(slug) });
    },
  });
}

export function useDeleteReview(shopId: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => (await api.del(`/reviews/${reviewId}`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', shopId] });
      void qc.invalidateQueries({ queryKey: queryKeys.shopRoot(slug) });
    },
  });
}

export function useMarkHelpful(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) =>
      (await api.post<{ helpful: boolean; count: number }>(`/reviews/${reviewId}/helpful`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reviews', shopId] }),
  });
}

export function useReplyToReview(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, comment }: { reviewId: string; comment: string }) =>
      (await api.post(`/reviews/${reviewId}/reply`, { comment })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reviews', shopId] }),
  });
}

// --- Saved shops -------------------------------------------------------------

export function useSavedShops() {
  const user = useAuth((s) => s.user);
  return useQuery({
    queryKey: queryKeys.saved,
    queryFn: async () => (await api.get<ShopCard[]>('/me/saved-shops')).data,
    enabled: Boolean(user),
  });
}

export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shopId: string) =>
      (await api.post<{ saved: boolean; shopId: string }>(`/me/saved-shops/${shopId}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.saved }),
  });
}

// --- Owner -------------------------------------------------------------------

export function useMyShops() {
  const isOwner = useAuth((s) => s.isOwner());
  return useQuery({
    queryKey: queryKeys.myShops,
    queryFn: async () => (await api.get<ShopDetail[]>('/shops/mine')).data,
    enabled: isOwner,
  });
}

export function useShopAnalytics(shopId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shopAnalytics(shopId ?? ''),
    queryFn: async () => (await api.get<ShopAnalytics>(`/shops/${shopId}/analytics`)).data,
    enabled: Boolean(shopId),
  });
}

export function useCreateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => (await api.post<ShopDetail>('/shops', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.myShops }),
  });
}

export function useUpdateShop(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => (await api.put<ShopDetail>(`/shops/${shopId}`, input)).data,
    onSuccess: (shop) => {
      void qc.invalidateQueries({ queryKey: queryKeys.myShops });
      void qc.invalidateQueries({ queryKey: queryKeys.shopRoot(shop.slug) });
    },
  });
}

export function useClaimShop(shopId: string, slug?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<{ message: string }>(`/shops/${shopId}/claim`)).data,
    onSuccess: () => {
      if (slug) void qc.invalidateQueries({ queryKey: queryKeys.shopRoot(slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.myShops });
    },
  });
}

export function useUploadImages(shopId: string, slug?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append('images', f));
      return (await api.upload<{ photos: ShopPhoto[]; total: number }>(`/shops/${shopId}/images`, form)).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.myShops });
      if (slug) void qc.invalidateQueries({ queryKey: queryKeys.shopRoot(slug) });
    },
  });
}

export function useDeleteShopImage(shopId: string, slug?: string) {
  const qc = useQueryClient();
  return useMutation({
    // The URL goes in the query string: it contains slashes, and an encoded
    // %2F inside a path segment does not survive every reverse proxy.
    mutationFn: async (url: string) =>
      (
        await api.del<{ photos: ShopPhoto[]; coverImage?: string }>(`/shops/${shopId}/images`, { url })
      ).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.myShops });
      if (slug) void qc.invalidateQueries({ queryKey: queryKeys.shopRoot(slug) });
    },
  });
}

// --- Admin -------------------------------------------------------------------

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: async () => (await api.get<AdminDashboard>('/admin/dashboard')).data,
  });
}

export function useAdminShops(params: { page: number; status?: string; q?: string }) {
  return useQuery({
    queryKey: queryKeys.adminShops(params),
    queryFn: async () => {
      const res = await api.get<AdminShop[]>('/admin/shops', { ...params, limit: 20 });
      return { items: res.data, meta: res.meta as PageMeta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useVerifyShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) =>
      (await api.put(`/admin/shops/${id}/verify`, { status, rejectionReason })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useToggleFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.put(`/admin/shops/${id}/featured`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'shops'] }),
  });
}

export function useAdminUsers(params: { page: number; role?: string; q?: string }) {
  return useQuery({
    queryKey: queryKeys.adminUsers(params),
    queryFn: async () => {
      const res = await api.get<AdminUser[]>('/admin/users', { ...params, limit: 20 });
      return { items: res.data, meta: res.meta as PageMeta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.put(`/admin/users/${id}/status`, { isActive })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/** Super admin only — the API rejects anyone else with a 403. */
export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) =>
      (await api.put(`/admin/users/${id}/role`, { role })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useToggleShopActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.put(`/admin/shops/${id}/active`)).data,
    // Suspending a shop changes its category's active count and removes it from
    // search, so invalidate the whole admin tree plus the public lists.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}

export function useDeleteShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.del(`/shops/${id}`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: queryKeys.myShops });
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}

// --- Admin: reviews ----------------------------------------------------------

export function useAdminReviews(params: { page: number; rating?: number }) {
  return useQuery({
    queryKey: queryKeys.adminReviews(params),
    queryFn: async () => {
      const res = await api.get<AdminReview[]>('/admin/reviews', { ...params, limit: 20 });
      return { items: res.data, meta: res.meta as PageMeta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.put(`/admin/reviews/${id}/moderate`, { isActive })).data,
    // Moderation recalculates the shop's rating aggregate server-side, so the
    // public shop caches are stale too — not just the admin list.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['shop'] });
    },
  });
}

// --- Admin: analytics --------------------------------------------------------

export function useAdminAnalytics(days: number) {
  return useQuery({
    queryKey: queryKeys.adminAnalytics(days),
    queryFn: async () => (await api.get<PlatformAnalytics>('/admin/analytics', { days })).data,
    placeholderData: keepPreviousData,
  });
}

// --- Admin: categories -------------------------------------------------------

export function useAdminCategories() {
  return useQuery({
    queryKey: queryKeys.adminCategories,
    queryFn: async () => (await api.get<AdminCategory[]>('/admin/categories')).data,
  });
}

/** Both the admin list and the public (cached) list go stale on any write. */
function invalidateCategories(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.adminCategories });
  void qc.invalidateQueries({ queryKey: queryKeys.categories });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput) => (await api.post<AdminCategory>('/categories', input)).data,
    onSuccess: () => invalidateCategories(qc),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }) =>
      (await api.put<AdminCategory>(`/categories/${id}`, input)).data,
    onSuccess: () => invalidateCategories(qc),
  });
}

/** Super admin only. Rejected with a 409 while active shops still use it. */
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.del(`/categories/${id}`)).data,
    onSuccess: () => invalidateCategories(qc),
  });
}

// --- Admin: audit trail ------------------------------------------------------

export function useAdminAuditLog(params: { page: number; action?: string }) {
  return useQuery({
    queryKey: queryKeys.adminAudit(params),
    queryFn: async () => {
      const res = await api.get<AuditEntry[]>('/admin/audit', { ...params, limit: 25 });
      return { items: res.data, meta: res.meta as PageMeta };
    },
    placeholderData: keepPreviousData,
  });
}


