import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/client';
import type { Computer, Component, Rental, Notification, FilterParams, DashboardStats, CalendarEvent } from '../types';

const queryKeys = {
  computers: {
    all: ['computers'] as const,
    lists: () => [...queryKeys.computers.all, 'list'] as const,
    list: (params: FilterParams) => [...queryKeys.computers.lists(), params] as const,
    details: () => [...queryKeys.computers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.computers.details(), id] as const,
    stats: () => [...queryKeys.computers.all, 'stats'] as const,
  },
  components: {
    all: ['components'] as const,
    lists: () => [...queryKeys.components.all, 'list'] as const,
    list: (params: FilterParams) => [...queryKeys.components.lists(), params] as const,
    details: () => [...queryKeys.components.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.components.details(), id] as const,
    available: (type?: string) => [...queryKeys.components.all, 'available', type] as const,
  },
  rentals: {
    all: ['rentals'] as const,
    lists: () => [...queryKeys.rentals.all, 'list'] as const,
    list: (params: FilterParams) => [...queryKeys.rentals.lists(), params] as const,
    details: () => [...queryKeys.rentals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.rentals.details(), id] as const,
    calendar: (start: string, end: string) => [...queryKeys.rentals.all, 'calendar', start, end] as const,
    stats: () => [...queryKeys.rentals.all, 'stats'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (params: FilterParams) => [...queryKeys.notifications.lists(), params] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
    recentActivity: () => ['dashboard', 'recent-activity'] as const,
  },
  settings: {
    all: ['settings'] as const,
    list: (category?: string) => [...queryKeys.settings.all, category] as const,
  },
};

export const useComputers = (params?: FilterParams) => {
  return useQuery({
    queryKey: queryKeys.computers.list(params || {}),
    queryFn: () => apiEndpoints.computers.list(params),
    select: (response) => response.data.data,
  });
};

export const useComputer = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.computers.detail(id),
    queryFn: () => apiEndpoints.computers.get(id),
    select: (response) => response.data.data,
    enabled: enabled && !!id,
  });
};

export const useComputerStats = () => {
  return useQuery({
    queryKey: queryKeys.computers.stats(),
    queryFn: () => apiEndpoints.computers.getStats(),
    select: (response) => response.data.data,
  });
};

export const useCreateComputer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Computer>) => apiEndpoints.computers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.stats() });
    },
  });
};

export const useUpdateComputer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Computer> }) => apiEndpoints.computers.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.detail(id) });
    },
  });
};

export const useDeleteComputer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.computers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.stats() });
    },
  });
};

export const useComponents = (params?: FilterParams) => {
  return useQuery({
    queryKey: queryKeys.components.list(params || {}),
    queryFn: () => apiEndpoints.components.list(params),
    select: (response) => response.data.data,
  });
};

export const useComponent = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.components.detail(id),
    queryFn: () => apiEndpoints.components.get(id),
    select: (response) => response.data.data,
    enabled: enabled && !!id,
  });
};

export const useAvailableComponents = (type?: string) => {
  return useQuery({
    queryKey: queryKeys.components.available(type),
    queryFn: () => apiEndpoints.components.getAvailable(type),
    select: (response) => response.data.data,
  });
};

export const useCreateComponent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Component>) => apiEndpoints.components.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components.lists() });
    },
  });
};

export const useUpdateComponent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Component> }) => apiEndpoints.components.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.components.detail(id) });
    },
  });
};

export const useDeleteComponent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.components.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components.lists() });
    },
  });
};

export const useInstallComponent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, computerId }: { componentId: string; computerId: string }) => 
      apiEndpoints.components.install(componentId, computerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.lists() });
    },
  });
};

export const useUninstallComponent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (componentId: string) => apiEndpoints.components.uninstall(componentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.components.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.computers.lists() });
    },
  });
};

export const useRentals = (params?: FilterParams) => {
  return useQuery({
    queryKey: queryKeys.rentals.list(params || {}),
    queryFn: () => apiEndpoints.rentals.list(params),
    select: (response) => response.data.data,
  });
};

export const useRental = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.rentals.detail(id),
    queryFn: () => apiEndpoints.rentals.get(id),
    select: (response) => response.data.data,
    enabled: enabled && !!id,
  });
};

export const useRentalStats = () => {
  return useQuery({
    queryKey: queryKeys.rentals.stats(),
    queryFn: () => apiEndpoints.rentals.getStats(),
    select: (response) => response.data.data,
  });
};

export const useCalendarEvents = (start: string, end: string) => {
  return useQuery({
    queryKey: queryKeys.rentals.calendar(start, end),
    queryFn: () => apiEndpoints.rentals.getCalendarEvents({ start, end }),
    select: (response) => response.data.data as CalendarEvent[],
    enabled: !!start && !!end,
  });
};

export const useCreateRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Rental>) => apiEndpoints.rentals.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.stats() });
    },
  });
};

export const useUpdateRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Rental> }) => apiEndpoints.rentals.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.detail(id) });
    },
  });
};

export const useDeleteRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.rentals.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.stats() });
    },
  });
};

export const useStartRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.rentals.start(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.detail(id) });
    },
  });
};

export const useCompleteRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.rentals.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.detail(id) });
    },
  });
};

export const useCancelRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.rentals.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals.detail(id) });
    },
  });
};

export const useNotifications = (params?: FilterParams) => {
  return useQuery({
    queryKey: queryKeys.notifications.list(params || {}),
    queryFn: () => apiEndpoints.notifications.list(params),
    select: (response) => response.data.data,
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => apiEndpoints.notifications.getUnreadCount(),
    select: (response) => response.data.data.count,
    refetchInterval: 30000,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiEndpoints.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiEndpoints.notifications.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiEndpoints.dashboard.getStats(),
    select: (response) => response.data.data as DashboardStats,
  });
};

export const useRecentActivity = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.recentActivity(),
    queryFn: () => apiEndpoints.dashboard.getRecentActivity(),
    select: (response) => response.data.data,
  });
};

export const useSettings = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.settings.list(category),
    queryFn: () => apiEndpoints.settings.list(category),
    select: (response) => response.data.data,
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => apiEndpoints.settings.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
};

export { queryKeys };