import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, setAuthToken, removeAuthToken, getRefreshToken, setRefreshToken, removeRefreshToken } from '../utils/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        setAuthToken(accessToken);
        setRefreshToken(newRefreshToken);

        processQueue(null, accessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (err) {
        processQueue(err as Error, null);
        removeAuthToken();
        removeRefreshToken();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const apiEndpoints = {
  auth: {
    login: (data: { email: string; password: string }) => api.post('/auth/login', data),
    register: (data: { email: string; password: string; name: string }) => api.post('/auth/register', data),
    refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    updateProfile: (data: Partial<{ name: string; avatar: string }>) => api.patch('/auth/me', data),
    changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
  },
  computers: {
    list: (params?: Record<string, unknown>) => api.get('/computers', { params }),
    get: (id: string) => api.get(`/computers/${id}`),
    create: (data: Partial<import('../types').Computer>) => api.post('/computers', data),
    update: (id: string, data: Partial<import('../types').Computer>) => api.patch(`/computers/${id}`, data),
    delete: (id: string) => api.delete(`/computers/${id}`),
    getStats: () => api.get('/computers/stats'),
  },
  components: {
    list: (params?: Record<string, unknown>) => api.get('/components', { params }),
    get: (id: string) => api.get(`/components/${id}`),
    create: (data: Partial<import('../types').Component>) => api.post('/components', data),
    update: (id: string, data: Partial<import('../types').Component>) => api.patch(`/components/${id}`, data),
    delete: (id: string) => api.delete(`/components/${id}`),
    getAvailable: (type?: string) => api.get('/components/available', { params: { type } }),
    install: (id: string, computerId: string) => api.post(`/components/${id}/install`, { computerId }),
    uninstall: (id: string) => api.post(`/components/${id}/uninstall`),
  },
  rentals: {
    list: (params?: Record<string, unknown>) => api.get('/rentals', { params }),
    get: (id: string) => api.get(`/rentals/${id}`),
    create: (data: Partial<import('../types').Rental>) => api.post('/rentals', data),
    update: (id: string, data: Partial<import('../types').Rental>) => api.patch(`/rentals/${id}`, data),
    delete: (id: string) => api.delete(`/rentals/${id}`),
    start: (id: string) => api.post(`/rentals/${id}/start`),
    complete: (id: string) => api.post(`/rentals/${id}/complete`),
    cancel: (id: string) => api.post(`/rentals/${id}/cancel`),
    getCalendarEvents: (params?: { start: string; end: string }) => api.get('/rentals/calendar', { params }),
    getStats: () => api.get('/rentals/stats'),
  },
  notifications: {
    list: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
    markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
    delete: (id: string) => api.delete(`/notifications/${id}`),
    getUnreadCount: () => api.get('/notifications/unread-count'),
  },
  settings: {
    list: (category?: string) => api.get('/settings', { params: { category } }),
    get: (key: string) => api.get(`/settings/${key}`),
    update: (key: string, value: string) => api.patch(`/settings/${key}`, { value }),
    updateMultiple: (data: Record<string, string>) => api.patch('/settings', data),
  },
  dashboard: {
    getStats: () => api.get('/dashboard/stats'),
    getRecentActivity: () => api.get('/dashboard/recent-activity'),
  },
};

export default api;