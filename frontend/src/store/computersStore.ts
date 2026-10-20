import { create } from 'zustand';
import type { Computer, Component, FilterParams, PaginatedResponse } from '../types';
import { apiEndpoints } from '../api/client';

interface ComputersState {
  computers: Computer[];
  selectedComputer: Computer | null;
  components: Component[];
  selectedComponent: Component | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: FilterParams;
  
  fetchComputers: (params?: FilterParams) => Promise<void>;
  fetchComputer: (id: string) => Promise<void>;
  createComputer: (data: Partial<Computer>) => Promise<Computer>;
  updateComputer: (id: string, data: Partial<Computer>) => Promise<Computer>;
  deleteComputer: (id: string) => Promise<void>;
  fetchComponents: (params?: FilterParams) => Promise<void>;
  fetchComponent: (id: string) => Promise<void>;
  createComponent: (data: Partial<Component>) => Promise<Component>;
  updateComponent: (id: string, data: Partial<Component>) => Promise<Component>;
  deleteComponent: (id: string) => Promise<void>;
  installComponent: (componentId: string, computerId: string) => Promise<void>;
  uninstallComponent: (componentId: string) => Promise<void>;
  getAvailableComponents: (type?: string) => Promise<Component[]>;
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

export const useComputersStore = create<ComputersState>((set, get) => ({
  computers: [],
  selectedComputer: null,
  components: [],
  selectedComponent: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: defaultFilters,

  fetchComputers: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const mergedParams = { ...get().filters, ...params };
      const response = await apiEndpoints.computers.list(mergedParams);
      const data: PaginatedResponse<Computer> = response.data.data;
      
      set({
        computers: data.data,
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
      set({ error: 'Failed to fetch computers', isLoading: false });
      throw error;
    }
  },

  fetchComputer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.computers.get(id);
      set({ selectedComputer: response.data.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch computer', isLoading: false });
      throw error;
    }
  },

  createComputer: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.computers.create(data);
      const newComputer = response.data.data;
      set((state) => ({
        computers: [newComputer, ...state.computers],
        pagination: { ...state.pagination, total: state.pagination.total + 1 },
        isLoading: false,
      }));
      return newComputer;
    } catch (error) {
      set({ error: 'Failed to create computer', isLoading: false });
      throw error;
    }
  },

  updateComputer: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.computers.update(id, data);
      const updatedComputer = response.data.data;
      set((state) => ({
        computers: state.computers.map((c) => (c.id === id ? updatedComputer : c)),
        selectedComputer: state.selectedComputer?.id === id ? updatedComputer : state.selectedComputer,
        isLoading: false,
      }));
      return updatedComputer;
    } catch (error) {
      set({ error: 'Failed to update computer', isLoading: false });
      throw error;
    }
  },

  deleteComputer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.computers.delete(id);
      set((state) => ({
        computers: state.computers.filter((c) => c.id !== id),
        pagination: { ...state.pagination, total: state.pagination.total - 1 },
        selectedComputer: state.selectedComputer?.id === id ? null : state.selectedComputer,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete computer', isLoading: false });
      throw error;
    }
  },

  fetchComponents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const mergedParams = { ...get().filters, ...params };
      const response = await apiEndpoints.components.list(mergedParams);
      const data: PaginatedResponse<Component> = response.data.data;
      
      set({
        components: data.data,
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
      set({ error: 'Failed to fetch components', isLoading: false });
      throw error;
    }
  },

  fetchComponent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.components.get(id);
      set({ selectedComponent: response.data.data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch component', isLoading: false });
      throw error;
    }
  },

  createComponent: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.components.create(data);
      const newComponent = response.data.data;
      set((state) => ({
        components: [newComponent, ...state.components],
        pagination: { ...state.pagination, total: state.pagination.total + 1 },
        isLoading: false,
      }));
      return newComponent;
    } catch (error) {
      set({ error: 'Failed to create component', isLoading: false });
      throw error;
    }
  },

  updateComponent: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiEndpoints.components.update(id, data);
      const updatedComponent = response.data.data;
      set((state) => ({
        components: state.components.map((c) => (c.id === id ? updatedComponent : c)),
        selectedComponent: state.selectedComponent?.id === id ? updatedComponent : state.selectedComponent,
        isLoading: false,
      }));
      return updatedComponent;
    } catch (error) {
      set({ error: 'Failed to update component', isLoading: false });
      throw error;
    }
  },

  deleteComponent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.components.delete(id);
      set((state) => ({
        components: state.components.filter((c) => c.id !== id),
        pagination: { ...state.pagination, total: state.pagination.total - 1 },
        selectedComponent: state.selectedComponent?.id === id ? null : state.selectedComponent,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete component', isLoading: false });
      throw error;
    }
  },

  installComponent: async (componentId, computerId) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.components.install(componentId, computerId);
      set((state) => ({
        components: state.components.map((c) =>
          c.id === componentId ? { ...c, status: 'installed', computerId } : c
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to install component', isLoading: false });
      throw error;
    }
  },

  uninstallComponent: async (componentId) => {
    set({ isLoading: true, error: null });
    try {
      await apiEndpoints.components.uninstall(componentId);
      set((state) => ({
        components: state.components.map((c) =>
          c.id === componentId ? { ...c, status: 'available', computerId: undefined } : c
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to uninstall component', isLoading: false });
      throw error;
    }
  },

  getAvailableComponents: async (type) => {
    try {
      const response = await apiEndpoints.components.getAvailable(type);
      return response.data.data;
    } catch (error) {
      set({ error: 'Failed to fetch available components' });
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