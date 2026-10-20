import { create } from 'zustand';
import type { Rental, FilterParams, PaginatedResponse, CalendarEvent } from '../types';
import { apiEndpoints } from '../api/client';

interface RentalsState {
  rentals: Rental[];
  selectedRental: Rental | null;
  calendarEvents: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: FilterParams;
  
  fetchRentals: (params?: FilterParams) => Promise<void>;
  fetchRental: (id: string) => Promise<void>;
  createRental: (data: Partial<Rental>) => Promise<Rental>;
  updateRental: (id: string, data: Partial<Rental>) => Promise<Rental>;
  deleteRental: (id: string) => Promise<void>;
  startRental: (id: string) => Promise<void>;
  completeRental: (id: string) => Promise<void>;
  cancelRental: (id: string) => Promise<void>;
  fetchCalendarEvents: (start: string, end: string) => Promise<void>;
  setFilters: (filters: Partial<FilterParams>) => void;
  clearFilters: () => void;
  clearError: () => void;
}

const defaultFilters: FilterParams = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  active: '#10b981',
  completed: '#6366f1',
  cancelled: '#ef4444',
  overdue: '#ef4444',
};

export const useRentalsStore = create<RentalsState>((set, get) => ({
  rentals: [],
  selectedRental: null,
  calendarEvents: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: defaultFilters,

  fetchRentals: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const mergedParams = { ...get().filters, ...params };
      const response = await apiEndpoints.rentals.list(mergedParams);
      const data: PaginatedResponse<Rental> = response.data.data;
      
      set({
        rentals: data.data,
        pagination: {
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
        },
        filters: mergedParams,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to fetch rentals', isLoading: false });
      throw error;
    }
  },

  fetchRental: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.rentals.get(id);
      set({ selectedRental: response.data.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch rental', isLoading: false });
      throw error;
    }
  },

  createRental: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.rentals.create(data);
      const newRental = response.data.data;
      set((state) => ({
        rentals: [newRental, ...state.rentals],
        pagination: { ...state.pagination, total: state.pagination.total + 1 },
        isLoading: false,
      }));
      return newRental;
    } catch (error) {
      set({ error: 'Failed to create rental', isLoading: false });
      throw error;
    }
  },

  updateRental: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.rentals.update(id, data);
      const updatedRental = response.data.data;
      set((state) => ({
        rentals: state.rentals.map((r) => (r.id === id ? updatedRental : r)),
        selectedRental: state.selectedRental?.id === id ? updatedRental : state.selectedRental,
        isLoading: false,
      }));
      return updatedRental;
    } catch (error) {
      set({ error: 'Failed to update rental', isLoading: false });
      throw error;
    }
  },

  deleteRental: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.rentals.delete(id);
      set((state) => ({
        rentals: state.rentals.filter((r) => r.id !== id),
        pagination: { ...state.pagination, total: state.pagination.total - 1 },
        selectedRental: state.selectedRental?.id === id ? null : state.selectedRental,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete rental', isLoading: false });
      throw error;
    }
  },

  startRental: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.rentals.start(id);
      set((state) => ({
        rentals: state.rentals.map((r) =>
          r.id === id ? { ...r, status: 'active' } : r
        ),
        selectedRental: state.selectedRental?.id === id
          ? { ...state.selectedRental, status: 'active' }
          : state.selectedRental,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to start rental', isLoading: false });
      throw error;
    }
  },

  completeRental: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.rentals.complete(id);
      set((state) => ({
        rentals: state.rentals.map((r) =>
          r.id === id ? { ...r, status: 'completed', actualReturnDate: new Date().toISOString() } : r
        ),
        selectedRental: state.selectedRental?.id === id
          ? { ...state.selectedRental, status: 'completed', actualReturnDate: new Date().toISOString() }
          : state.selectedRental,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to complete rental', isLoading: false });
      throw error;
    }
  },

  cancelRental: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.rentals.cancel(id);
      set((state) => ({
        rentals: state.rentals.map((r) =>
          r.id === id ? { ...r, status: 'cancelled' } : r
        ),
        selectedRental: state.selectedRental?.id === id
          ? { ...state.selectedRental, status: 'cancelled' }
          : state.selectedRental,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to cancel rental', isLoading: false });
      throw error;
    }
  },

  fetchCalendarEvents: async (start, end) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.rentals.getCalendarEvents({ start, end });
      const events: CalendarEvent[] = response.data.data.map((rental: Rental) => ({
        id: rental.id,
        title: `${rental.computer.name} - ${rental.user.name}`,
        start: new Date(rental.startDate),
        end: new Date(rental.endDate),
        rentalId: rental.id,
        computerId: rental.computerId,
        computerName: rental.computer.name,
        userName: rental.user.name,
        status: rental.status,
        color: statusColors[rental.status] || '#6366f1',
      }));
      set({ calendarEvents: events, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch calendar events', isLoading: false });
      throw error;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters, page: 1 },
    }));
  },

  clearFilters: () => {
    set({ filters: defaultFilters });
  },

  clearError: () => {
    set({ error: null });
  },
}));