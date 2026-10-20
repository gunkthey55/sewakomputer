import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './client'
import type {
  Rental,
  RentalFilters,
  RentalCreate,
  RentalUpdate,
  Computer,
  ComputerFilters,
  ComputerCreate,
  ComputerUpdate,
  Component,
  ComponentCreate,
  ComponentUpdate,
  PaginatedResponse,
  DashboardStats,
  Notification,
  NotificationFilters,
  User,
  TokenResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  Reminder,
  MessageResponse,
  UnreadCountResponse,
} from './types'

// ===== Auth =====
export const useLogin = () => {
  const queryClient = useQueryClient()
  return useMutation<TokenResponse, ApiError, LoginRequest>({
    mutationFn: (data) => api.postForm('/auth/login', { username: data.email, password: data.password }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export const useRegister = () =>
  useMutation<User, ApiError, RegisterRequest>({
    mutationFn: (data) => api.post('/auth/register', data),
  })

export const useRefreshToken = () =>
  useMutation<TokenResponse, ApiError, RefreshTokenRequest>({
    mutationFn: (data) => api.post('/auth/refresh', data),
  })

export const useMe = () =>
  useQuery<User, ApiError>({
    queryKey: ['user'],
    queryFn: () => api.get('/auth/me'),
    retry: false,
  })

// ===== Dashboard =====
export const useDashboardStats = () =>
  useQuery<DashboardStats, ApiError>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats'),
  })

// ===== Computers =====
export const useComputers = (filters: ComputerFilters = {}) =>
  useQuery<PaginatedResponse<Computer>, ApiError>({
    queryKey: ['computers', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value))
      })
      return api.get(`/computers?${params.toString()}`)
    },
  })

export const useComputer = (id: number, withComponents = false) =>
  useQuery<Computer, ApiError>({
    queryKey: ['computers', id, withComponents],
    queryFn: () => api.get(`/computers/${id}?with_components=${withComponents}`),
    enabled: !!id,
  })

export const useCreateComputer = () => {
  const queryClient = useQueryClient()
  return useMutation<Computer, ApiError, ComputerCreate>({
    mutationFn: (data) => api.post('/computers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
    },
  })
}

export const useUpdateComputer = () => {
  const queryClient = useQueryClient()
  return useMutation<Computer, ApiError, { id: number; data: ComputerUpdate }>({
    mutationFn: ({ id, data }) => api.patch(`/computers/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['computers', id] })
    },
  })
}

export const useDeleteComputer = () => {
  const queryClient = useQueryClient()
  return useMutation<MessageResponse, ApiError, number>({
    mutationFn: (id) => api.delete(`/computers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
    },
  })
}

export const useSetComputerAvailability = () => {
  const queryClient = useQueryClient()
  return useMutation<Computer, ApiError, { id: number; is_available: boolean }>({
    mutationFn: ({ id, is_available }) => api.postEmpty(`/computers/${id}/availability?is_available=${is_available}`),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['computers', id] })
    },
  })
}

// ===== Components =====
export const useComponents = (computerId: number) =>
  useQuery<Component[], ApiError>({
    queryKey: ['components', computerId],
    queryFn: () => api.get(`/computers/${computerId}/components`),
    enabled: !!computerId,
  })

export const useCreateComponent = () => {
  const queryClient = useQueryClient()
  return useMutation<Component, ApiError, ComponentCreate>({
    mutationFn: (data) => api.post(`/computers/${data.computer_id}/components`, data),
    onSuccess: (_, { computer_id }) => {
      queryClient.invalidateQueries({ queryKey: ['components', computer_id] })
      queryClient.invalidateQueries({ queryKey: ['computers', computer_id, true] })
    },
  })
}

export const useUpdateComponent = () => {
  const queryClient = useQueryClient()
  return useMutation<Component, ApiError, { id: number; data: ComponentUpdate }>({
    mutationFn: ({ id, data }) => api.patch(`/computers/components/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] })
    },
  })
}

export const useDeleteComponent = () => {
  const queryClient = useQueryClient()
  return useMutation<MessageResponse, ApiError, number>({
    mutationFn: (id) => api.delete(`/computers/components/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] })
    },
  })
}

// ===== Rentals =====
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

export const useMyActiveRentals = () =>
  useQuery<Rental[], ApiError>({
    queryKey: ['rentals', 'my', 'active'],
    queryFn: () => api.get('/rentals/my/active'),
  })

export const useRental = (id: number) =>
  useQuery<Rental, ApiError>({
    queryKey: ['rentals', id],
    queryFn: () => api.get(`/rentals/${id}`),
    enabled: !!id,
  })

export const useCreateRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, RentalCreate>({
    mutationFn: (data) => api.post('/rentals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['computers'] })
    },
  })
}

export const useUpdateRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, { id: number; data: RentalUpdate }>({
    mutationFn: ({ id, data }) => api.patch(`/rentals/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['rentals', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export const useReturnRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, number>({
    mutationFn: (id) => api.postEmpty(`/rentals/${id}/return`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['rentals', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['computers'] })
    },
  })
}

export const useCancelRental = () => {
  const queryClient = useQueryClient()
  return useMutation<Rental, ApiError, number>({
    mutationFn: (id) => api.postEmpty(`/rentals/${id}/cancel`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['rentals', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['computers'] })
    },
  })
}

export const useDeleteRental = () => {
  const queryClient = useQueryClient()
  return useMutation<MessageResponse, ApiError, number>({
    mutationFn: (id) => api.delete(`/rentals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

// ===== Notifications =====
export const useNotifications = (filters: NotificationFilters = {}) =>
  useQuery<PaginatedResponse<Notification>, ApiError>({
    queryKey: ['notifications', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value))
      })
      return api.get(`/notifications?${params.toString()}`)
    },
  })

export const useUnreadNotificationsCount = () =>
  useQuery<UnreadCountResponse, ApiError>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count'),
    refetchInterval: 30000,
  })

export const useNotification = (id: number) =>
  useQuery<Notification, ApiError>({
    queryKey: ['notifications', id],
    queryFn: () => api.get(`/notifications/${id}`),
    enabled: !!id,
  })

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()
  return useMutation<Notification, ApiError, number>({
    mutationFn: (id) => api.postEmpty(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient()
  return useMutation<MessageResponse, ApiError, void>({
    mutationFn: () => api.postEmpty('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export const useDeleteNotification = () => {
  const queryClient = useQueryClient()
  return useMutation<MessageResponse, ApiError, number>({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

// ===== Reminders =====
export const usePendingReminders = (limit = 100) =>
  useQuery<Reminder[], ApiError>({
    queryKey: ['reminders', 'pending', limit],
    queryFn: () => api.get(`/reminders/pending?limit=${limit}`),
  })

export const useProcessReminders = () => {
  const queryClient = useQueryClient()
  return useMutation<MessageResponse, ApiError, void>({
    mutationFn: () => api.postEmpty('/reminders/process'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export const useCreateRentalReminders = () => {
  const queryClient = useQueryClient()
  return useMutation<Reminder[], ApiError, number>({
    mutationFn: (rentalId) => api.postEmpty(`/reminders/rental/${rentalId}/create`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })
}

// ===== Schedules =====
export const useSchedules = (filters: { page?: number; page_size?: number; computer_id?: number } = {}) =>
  useQuery<PaginatedResponse<Schedule>, ApiError>({
    queryKey: ['schedules', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') params.append(key, String(value))
      })
      return api.get(`/schedules?${params.toString()}`)
    },
  })

export const useSchedule = (id: number) =>
  useQuery<Schedule, ApiError>({
    queryKey: ['schedules', id],
    queryFn: () => api.get(`/schedules/${id}`),
    enabled: !!id,
  })

export const useCreateSchedule = () => {
  const queryClient = useQueryClient()
  return useMutation<Schedule, ApiError, ScheduleCreate>({
    mutationFn: (data) => api.post('/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient()
  return useMutation<Schedule, ApiError, { id: number; data: ScheduleUpdate }>({
    mutationFn: ({ id, data }) => api.patch(`/schedules/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['schedules', id] })
    },
  })
}

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient()
  return useMutation<MessageResponse, ApiError, number>({
    mutationFn: (id) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}