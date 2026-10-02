import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAccessToken } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous';
  login: (identifier: string, password: string) => Promise<User>;
  register: (input: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName?: string;
    role: 'customer' | 'owner';
  }) => Promise<{ user: User; devCode?: string }>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User | null) => void;
  isOwner: () => boolean;
  isAdmin: () => boolean;
}

export const useAuth = create<AuthState>()((set, get) => ({
  user: null,
  status: 'idle',

  setUser: (user) => set({ user, status: user ? 'authenticated' : 'anonymous' }),

  login: async (identifier, password) => {
    const res = await api.post<{ user: User; tokens: { accessToken: string } }>('/auth/login', {
      identifier,
      password,
    });
    setAccessToken(res.data.tokens.accessToken);
    set({ user: res.data.user, status: 'authenticated' });
    return res.data.user;
  },

  register: async (input) => {
    const res = await api.post<{ user: User; tokens: { accessToken: string }; otp?: { devCode?: string } }>(
      '/auth/register',
      input,
    );
    setAccessToken(res.data.tokens.accessToken);
    set({ user: res.data.user, status: 'authenticated' });
    return { user: res.data.user, devCode: res.data.otp?.devCode };
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'anonymous' });
    }
  },

  /**
   * Restores the session on page load.
   * The access token is memory-only (never in localStorage), so after a
   * refresh we silently re-acquire it via the httpOnly refresh cookie.
   */
  hydrate: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      // Attempt silent token refresh from the httpOnly cookie first,
      // since the in-memory token is always null on page load.
      const refreshRes = await api.post<{ tokens: { accessToken: string } }>('/auth/refresh');
      setAccessToken(refreshRes.data.tokens.accessToken);

      const res = await api.get<User>('/auth/me');
      set({ user: res.data, status: 'authenticated' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'anonymous' });
    }
  },

  isOwner: () => {
    const role = get().user?.role;
    return role === 'owner' || role === 'admin' || role === 'super_admin';
  },

  isAdmin: () => {
    const role = get().user?.role;
    return role === 'admin' || role === 'super_admin';
  },
}));

// --- Location ---------------------------------------------------------------

export interface Coords {
  lat: number;
  lng: number;
}

interface LocationState {
  coords: Coords | null;
  label: string;
  radius: number;
  status: 'idle' | 'locating' | 'granted' | 'denied';
  detect: () => Promise<void>;
  setManual: (coords: Coords, label: string) => void;
  setRadius: (radius: number) => void;
  clear: () => void;
}

/** Default map centre when the user hasn't shared their location. */
export const BHOPAL: Coords = { lat: 23.2599, lng: 77.4126 };

export const useLocation = create<LocationState>()(
  persist(
    (set) => ({
      coords: null,
      label: 'Bhopal, MP',
      radius: 5,
      status: 'idle',

      detect: async () => {
        if (!('geolocation' in navigator)) {
          set({ status: 'denied' });
          return;
        }

        set({ status: 'locating' });

        return new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              set({
                coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                label: 'Current location',
                status: 'granted',
              });
              resolve();
            },
            () => {
              // Denied or unavailable — fall back to the city centre.
              set({ coords: BHOPAL, label: 'Bhopal', status: 'denied' });
              resolve();
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 },
          );
        });
      },

      setManual: (coords, label) => set({ coords, label, status: 'granted' }),
      setRadius: (radius) => set({ radius }),
      clear: () => set({ coords: null, label: 'Bhopal', status: 'idle' }),
    }),
    { name: 'shopzy.location', partialize: (s) => ({ coords: s.coords, label: s.label, radius: s.radius }) },
  ),
);

// --- Toasts -----------------------------------------------------------------

export interface Toast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: Toast['variant']) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, variant = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// --- Theme (Dark Mode) ------------------------------------------------------

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const next: Theme = get().theme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        set({ theme: next });
      },
      setTheme: (theme: Theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'shopzy.theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    },
  ),
);

