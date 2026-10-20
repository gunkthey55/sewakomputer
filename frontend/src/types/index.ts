export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Computer {
  id: string;
  name: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  specifications: ComputerSpecs;
  components: Component[];
  createdAt: string;
  updatedAt: string;
}

export interface ComputerSpecs {
  cpu: string;
  ram: string;
  storage: string;
  gpu?: string;
  os: string;
}

export interface Component {
  id: string;
  name: string;
  type: ComponentType;
  serialNumber: string;
  manufacturer: string;
  model: string;
  status: 'available' | 'installed' | 'maintenance' | 'retired';
  computerId?: string;
  computer?: Computer;
  purchaseDate: string;
  purchasePrice: number;
  warrantyExpiry?: string;
  specifications: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type ComponentType = 
  | 'cpu' 
  | 'ram' 
  | 'storage' 
  | 'gpu' 
  | 'motherboard' 
  | 'psu' 
  | 'cooler' 
  | 'case' 
  | 'monitor' 
  | 'keyboard' 
  | 'mouse' 
  | 'other';

export interface Rental {
  id: string;
  computerId: string;
  computer: Computer;
  userId: string;
  user: User;
  components: RentalComponent[];
  startDate: string;
  endDate: string;
  actualReturnDate?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'overdue';
  purpose: string;
  notes?: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface RentalComponent {
  id: string;
  rentalId: string;
  componentId: string;
  component: Component;
  quantity: number;
  price: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  description: string;
  category: 'general' | 'rental' | 'notification' | 'system';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface DashboardStats {
  totalComputers: number;
  availableComputers: number;
  rentedComputers: number;
  maintenanceComputers: number;
  totalComponents: number;
  availableComponents: number;
  activeRentals: number;
  pendingRentals: number;
  overdueRentals: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  rentalId: string;
  computerId: string;
  computerName: string;
  userName: string;
  status: Rental['status'];
  color: string;
}

export interface WebSocketMessage {
  type: 'notification' | 'rental_update' | 'computer_update' | 'component_update';
  payload: unknown;
  timestamp: string;
}