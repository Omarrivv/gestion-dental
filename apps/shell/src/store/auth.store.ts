import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';

export interface AuthUser {
  userId: string;
  organizationId: string;
  role: string;
  branchIds: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;

  login: (organizationSlug: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string, user: AuthUser) => void;
}

const API_BASE = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken, user) => {
        // Attach to axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        set({ accessToken, refreshToken, user, isAuthenticated: true });
      },

      login: async (organizationSlug, email, password) => {
        const res = await axios.post(`${API_BASE}/api/v1/auth/login`, {
          organizationSlug,
          email,
          password,
        });

        const { accessToken, refreshToken, userId, organizationId, role } = res.data;
        get().setTokens(accessToken, refreshToken, {
          userId,
          organizationId,
          role,
          branchIds: res.data.branchIds ?? [],
        });
      },

      logout: () => {
        delete axios.defaults.headers.common['Authorization'];
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'dental-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ── Axios interceptor: re-attach token on app reload ─────────────────────────
const stored = useAuthStore.getState();
if (stored.accessToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${stored.accessToken}`;
}
