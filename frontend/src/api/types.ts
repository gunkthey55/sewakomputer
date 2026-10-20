export interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export interface Computer {
  id: number
  name: string
  spec_json: Record<string, unknown>
  status: 'available' | 'rented' | 'maintenance'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Component {
  id: number
  name: string
  category: string
  spec_json: Record<string, unknown>
  quantity_total: number
  quantity_available: number
  price_per_day: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RentalComponent {
  id: number
  rental_id: number
  component_id: number
  quantity: number
  price_per_day: number
  component: Component
}

export interface Rental {
  id: number
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  start_date: string
  end_date: string
  actual_return_date: string | null
  status: 'active' | 'pending' | 'overdue' | 'completed' | 'cancelled'
  total_price: number
  paid_amount: number
  payment_status: 'unpaid' | 'partial' | 'paid'
  notes: string | null
  created_at: string
  updated_at: string
  computer: Computer
  components: RentalComponent[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface RentalFilters {
  status?: string
  customer_name?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateRentalRequest {
  customer_name: string
  customer_email?: string
  customer_phone?: string
  computer_id: number
  start_date: string
  end_date: string
  notes?: string
  components: Array<{
    component_id: number
    quantity: number
    price_per_day: number
  }>
}

export interface UpdateRentalRequest extends Partial<CreateRentalRequest> {}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  full_name: string
}

export interface Notification {
  id: number
  rental_id: number | null
  type: 'reminder' | 'overdue' | 'status_change' | 'system'
  title: string
  message: string
  is_read: boolean
  created_at: string
  rental?: {
    id: number
    customer_name: string
    status: string
  }
}

export interface Reminder {
  id: number
  rental_id: number
  channel: 'in_app' | 'telegram' | 'email'
  remind_at: string
  status: 'pending' | 'sent' | 'failed'
  message: string
  sent_at: string | null
}

export interface DashboardStats {
  active_rentals: number
  ending_today: number
  ending_this_week: number
  overdue_rentals: number
  revenue_this_month: number
  revenue_last_month: number
  recent_rentals: Rental[]
}