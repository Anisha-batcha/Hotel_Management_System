export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  created_at?: string;
}

export interface Room {
  id: number;
  room_number: string;
  room_type: string;
  price_per_night: number | string;
  capacity: number;
  description?: string;
  amenities?: string;
  image_url?: string;
  status: 'available' | 'maintenance' | 'unavailable';
  created_at?: string;
}

export interface Booking {
  id: number;
  user_id: number;
  room_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  special_requests?: string;
  total_amount: number | string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
  created_at?: string;
  room_number?: string;
  room_type?: string;
  image_url?: string;
  price_per_night?: number | string;
  full_name?: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  total_rooms: number;
  available_rooms: number;
  total_bookings: number;
  pending_bookings: number;
  total_users: number;
  revenue: number;
}
