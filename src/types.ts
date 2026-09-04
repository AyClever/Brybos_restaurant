export type UserRole = 'customer' | 'admin' | 'sales_rep' | 'rider' | null;

export interface User {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string | number;
  name: string;
  description: string;
  price: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'drinks';
  image: string;
  badge?: string;
  available: boolean;
  created_at?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'approved'
  | 'assigned'
  | 'onway'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string | number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark: string;
  items: CartItem[];
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: OrderStatus;
  riderId?: string | number;
  riderName?: string;
  salesRepId?: string | number;
  createdAt: string;
  updatedAt: string;
  estimatedTime?: string;
}

export interface Rider {
  id: string | number;
  profileId?: string;
  name: string;
  email?: string;
  phone: string;
  bikeNumber: string;
  licenseNumber: string;
  availability: 'available' | 'busy' | 'offline';
  totalDeliveries: number;
  rating: number;
  earnings: number;
  roleNumber?: number;
  loginPassword?: string;
  lat?: number;
  lng?: number;
}

export interface SalesRep {
  id: string | number;
  profileId?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  ordersHandled: number;
  status: 'active' | 'inactive';
  roleNumber?: number;
  loginPassword?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerId?: string | number;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  transactionRef?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userId?: string;
  targetRole?: string;
}

export interface Coupon {
  code: string;
  discount: number;
  type: 'percent' | 'flat';
}
