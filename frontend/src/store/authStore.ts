import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import { api, apiEndpoints } from '../api/client';
import { hasValidToken, clearTokens } from '../utils/tokenStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      initializeAuth: async () => {
        const token = localStorage.getItem('access_token');
        if (token && hasValidToken()) {
          try {
            const response = await apiEndpoints.auth.me();
            set({ user: response.data.data, token, isAuthenticated: true, isLoading: false });
          } catch {
            clearTokens();
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          clearTokens();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiEndpoints.auth.login({ email, password });
          const { accessToken, refreshToken, user } = response.data.data;
          
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          
          set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await apiEndpoints.auth.register(data);
          const { accessToken, refreshToken, user } = response.data.data;
          
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          
          set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        clearTokens();
        apiEndpoints.auth.logout().catch(() => {});
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await apiEndpoints.auth.refresh(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        
        set({ token: accessToken });
      },

      updateProfile: async (data) => {
        const response = await apiEndpoints.auth.updateProfile(data);
        set({ user: response.data.data });
      },

      changePassword: async (data) => {
        await apiEndpoints.auth.changePassword(data);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);