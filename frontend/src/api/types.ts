// ===== Enums (mirror backend) =====
export type UserRole = 'admin' | 'staff' | 'customer'
export type RentalStatus = 'pending' | 'active' | 'overdue' | 'completed' | 'cancelled'
export type NotificationType = 'reminder' | 'overdue' | 'status_change' | 'system'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read'
export type ReminderChannel = 'in_app' | 'telegram' | 'email'

// ===== Base Types =====
export interface User {
  id: number
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  telegram_chat_id: string | null
  created_at: string
  updated_at: string
}

export interface Computer {
  id: number
  name: string
  description: string | null
  serial_number: string
  brand: string
  model: string
  purchase_date: string | null
  purchase_price: number | null
  rental_price_per_day: number
  rental_price_per_week: number
  rental_price_per_month: number
  is_available: boolean
  is_active: boolean
  location: string | null
  created_at: string
  updated_at: string
  components?: Component[]
}

export interface Component {
  id: number
  name: string
  component_type: string
  brand: string | null
  model: string | null
  serial_number: string | null
  specifications: string | null
  computer_id: number
  created_at: string
  updated_at: string
  computer?: Computer
}

export interface RentalItem {
  id: number
  rental_id: number
  computer_id: number
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  computer?: Computer
}

export interface Rental {
  id: number
  user_id: number
  start_date: string
  end_date: string
  deposit: number
  notes: string | null
  status: RentalStatus
  total_price: number
  actual_return_date: string | null
  created_at: string
  updated_at: string
  items: RentalItem[]
  user?: User
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ===== Request Types =====
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  phone?: string
  role?: UserRole
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ComputerCreate {
  name: string
  description?: string
  serial_number: string
  brand: string
  model: string
  purchase_date?: string
  purchase_price?: number
  rental_price_per_day: number
  rental_price_per_week: number
  rental_price_per_month: number
  is_available?: boolean
  is_active?: boolean
  location?: string
}

export interface ComputerUpdate {
  name?: string
  description?: string
  serial_number?: string
  brand?: string
  model?: string
  purchase_date?: string
  purchase_price?: number
  rental_price_per_day?: number
  rental_price_per_week?: number
  rental_price_per_month?: number
  is_available?: boolean
  is_active?: boolean
  location?: string
}

export interface ComponentCreate {
  name: string
  component_type: string
  brand?: string
  model?: string
  serial_number?: string
  specifications?: string
  computer_id: number
}

export interface ComponentUpdate {
  name?: string
  component_type?: string
  brand?: string
  model?: string
  serial_number?: string
  specifications?: string
}

export interface RentalItemCreate {
  computer_id: number
  quantity: number
  unit_price: number
}

export interface RentalCreate {
  user_id: number
  start_date: string
  end_date: string
  deposit?: number
  notes?: string
  items: RentalItemCreate[]
}

export interface RentalUpdate {
  status?: RentalStatus
  actual_return_date?: string
  notes?: string
}

export interface NotificationCreate {
  user_id: number
  type: NotificationType
  title: string
  message: string
  related_rental_id?: number
}

export interface NotificationUpdate {
  status?: NotificationStatus
  error_message?: string
}

export interface Notification {
  id: number
  user_id: number
  type: NotificationType
  title: string
  message: string
  status: NotificationStatus
  related_rental_id: number | null
  sent_at: string | null
  error_message: string | null
  created_at: string
  user?: User
  rental?: Rental
}

export interface Reminder {
  id: number
  rental_id: number
  channel: ReminderChannel
  days_before: number
  scheduled_for: string
  sent_at: string | null
  is_sent: boolean
  retry_count: number
  error_message: string | null
  created_at: string
}

export interface Schedule {
  id: number
  name: string
  description: string | null
  computer_id: number
  start_time: string
  end_time: string
  is_recurring: boolean
  recurrence_rule: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  computer?: Computer
}

export interface ScheduleCreate {
  name: string
  description?: string
  computer_id: number
  start_time: string
  end_time: string
  is_recurring?: boolean
  recurrence_rule?: string
  is_active?: boolean
}

export interface ScheduleUpdate {
  name?: string
  description?: string
  computer_id?: number
  start_time?: string
  end_time?: string
  is_recurring?: boolean
  recurrence_rule?: string
  is_active?: boolean
}

// ===== Filter Types =====
export interface RentalFilters {
  page?: number
  page_size?: number
  user_id?: number
  status?: RentalStatus
  search?: string
}

export interface ComputerFilters {
  page?: number
  page_size?: number
  search?: string
  is_available?: boolean
  is_active?: boolean
  brand?: string
}

export interface NotificationFilters {
  page?: number
  page_size?: number
  status?: NotificationStatus
  notification_type?: NotificationType
}

export interface ReminderFilters {
  page?: number
  page_size?: number
  rental_id?: number
  channel?: ReminderChannel
  is_sent?: boolean
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

export interface MessageResponse {
  message: string
}

export interface UnreadCountResponse {
  unread_count: number
}