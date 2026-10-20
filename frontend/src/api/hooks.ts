import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './client'
import type {
  Rental,
  RentalFilters,
  CreateRentalRequest,
  UpdateRentalRequest,
  Computer,
  Component,
  PaginatedResponse,
  DashboardStats,
  Notification,
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from './types'

// Auth
export const useLogin = () => {
  const queryClient = useQueryClient()
  return useMutation<AuthResponse, ApiError, LoginRequest>({
    mutationFn: (data) => api.post('/auth/login', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export const useRegister = () =>
  useMutation<AuthResponse, ApiError, RegisterRequest>({
    mutationFn: (data) => api.post('/auth/register', data),
  })

export const useMe = () =>
  useQuery<User, ApiError>({
    queryKey: ['user'],
    queryFn: () => api.get('/auth/me'),
    retry: false,
  })

// Dashboard
export const useDashboardStats = () =>
  useQuery<DashboardStats, ApiError>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats'),
  })

// Computers
export const useComputers = (status?: string) =>
  useQuery<Computer[], ApiError>({
    queryKey: ['computers', status],
    queryFn: () => api.get(`/computers${status ? `?status=${status}` : ''}`),
  })

export const useComputer = (id: number) =>
  useQuery<Computer, ApiError>({
    queryKey: ['computers', id],
    queryFn: () => api.get(`/computers/${id}`),
    enabled: !!id,
  })

// Components
export const useComponents = (category?: string) =>
  useQuery<Component[], ApiError>({
    queryKey: ['components', category],
    queryFn: () => api.get(`/components${category ? `?category=${category}` : ''}`),
  })

// Rentals
export const useRentals = (filters: RentalFilters = {}) =>
  useQuery<PaginatedResponse<Rental>, ApiError>({
    queryKey: ['rentals', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value))
      })
      return api.get(`/rentals?${params.toString()}`)
    },
  })

export const useRental = (id: number) =>
  useQuery<Rental, ApiError>({
    queryKey: ['rentals', id],
    queryFn: () => api.get(`/rentals/${id}`),
    enabled: !!id,
  })

export const useCreateRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, CreateRentalRequest>({
    mutationFn: (data) => api.post('/rentals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
    },
  })
}

export const useUpdateRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, { id: number; data: UpdateRentalRequest }>({
    mutationFn: ({ id, data }) => api.put(`/rentals/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['rentals', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export const useStartRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, number>({
    mutationFn: (id) => api.post(`/rentals/${id}/start`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['rentals', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export const useCompleteRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, number>({
    mutationFn: (id) => api.post(`/rentals/${id}/complete`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['rentals', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export const useCancelRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, number>({
    mutationFn: (id) => api.post(`/rentals/${id}/cancel`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['rentals', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

// Notifications
export const useNotifications = () =>
  useQuery<Notification[], ApiError>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
  })

export const useUnreadNotificationsCount = () =>
  useQuery<number, ApiError>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count'),
    refetchInterval: 30000,
  })

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, void>({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}