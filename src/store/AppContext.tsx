import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import {
  UserRole,
  User,
  MenuItem,
  CartItem,
  OrderStatus,
  Order,
  Rider,
  SalesRep,
  Notification,
  Coupon,
} from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/authService';
import { menuService } from '../services/menuService';
import { orderService } from '../services/orderService';
import { riderService } from '../services/riderService';
import { salesRepService } from '../services/salesRepService';
import { notificationService } from '../services/notificationService';

// Re-export types for existing consumers
export type {
  UserRole,
  User,
  MenuItem,
  CartItem,
  OrderStatus,
  Order,
  Rider,
  SalesRep,
  Notification,
  Coupon,
};

interface AppState {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  menuItems: MenuItem[];
  riders: Rider[];
  salesReps: SalesRep[];
  notifications: Notification[];
  isCartOpen: boolean;
  currentPage: string;
  coupon: Coupon | null;
  couponCode: string;
  unreadNotifications: number;
  isSupabaseLive: boolean;
}

type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_MENU_ITEMS'; payload: MenuItem[] }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_RIDERS'; payload: Rider[] }
  | { type: 'SET_SALES_REPS'; payload: SalesRep[] }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_TO_CART'; payload: MenuItem }
  | { type: 'REMOVE_FROM_CART'; payload: string | number }
  | { type: 'UPDATE_CART_QTY'; payload: { id: string | number; qty: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'PLACE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: OrderStatus; riderId?: string | number; riderName?: string } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIF_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'SET_PAGE'; payload: string }
  | { type: 'APPLY_COUPON'; payload: Coupon }
  | { type: 'REMOVE_COUPON' }
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem }
  | { type: 'UPDATE_MENU_ITEM'; payload: MenuItem }
  | { type: 'DELETE_MENU_ITEM'; payload: string | number }
  | { type: 'ADD_RIDER'; payload: Rider }
  | { type: 'UPDATE_RIDER'; payload: Rider }
  | { type: 'DELETE_RIDER'; payload: string | number }
  | { type: 'UPDATE_RIDER_STATUS'; payload: { id: string | number; availability: Rider['availability'] } }
  | { type: 'ADD_SALES_REP'; payload: SalesRep }
  | { type: 'UPDATE_SALES_REP'; payload: SalesRep }
  | { type: 'DELETE_SALES_REP'; payload: string | number }
  | { type: 'CANCEL_ORDER'; payload: string }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'SET_SUPABASE_LIVE'; payload: boolean };

// Local database persistence helpers for reliable multi-session edits & deletes
const loadStoredData = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as unknown as T;
      }
    }
  } catch {}
  return fallback;
};

const saveStoredData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

// ===== INITIAL STARTER CATALOG =====
const initialMenuItems: MenuItem[] = [
  { id: 'm1', name: 'Classic Pancake Stack', description: 'Fluffy golden pancakes with maple syrup, fresh berries and whipped cream', price: 3500, category: 'breakfast', image: '/food-breakfast.jpg', badge: 'Popular', available: true },
  { id: 'm2', name: 'Full English Breakfast', description: 'Eggs, grilled sausages, bacon, toast, grilled tomatoes and mushrooms', price: 4500, category: 'breakfast', image: '/food-breakfast.jpg', badge: 'Bestseller', available: true },
  { id: 'm3', name: 'Avocado Toast Special', description: 'Sourdough toast with smashed avocado, poached eggs and cherry tomatoes', price: 3200, category: 'breakfast', image: '/food-breakfast.jpg', available: true },
  { id: 'm4', name: 'Nigerian Akara & Pap', description: 'Freshly fried bean cakes served with smooth ogi and fresh pepper sauce', price: 2500, category: 'breakfast', image: '/food-breakfast.jpg', badge: 'Local', available: true },

  { id: 'm5', name: 'Signature Jollof Rice', description: 'Premium smoky party jollof rice with fried chicken and coleslaw', price: 6500, category: 'lunch', image: '/food-rice.jpg', badge: 'Bestseller', available: true },
  { id: 'm6', name: 'Grilled Chicken Burger', description: 'Spicy grilled chicken breast in sesame bun with fresh veggies and sauces', price: 4500, category: 'lunch', image: '/food-burger.jpg', badge: 'Spicy 🌶', available: true },
  { id: 'm7', name: 'Fried Rice & Assorted', description: 'Nigerian-style fried rice with chicken, shrimp and mixed vegetables', price: 6000, category: 'lunch', image: '/food-rice.jpg', available: true },
  { id: 'm8', name: 'Ofada Rice & Ayamase', description: 'Local brown rice with authentic ayamase sauce and assorted meats', price: 5500, category: 'lunch', image: '/food-rice.jpg', badge: 'Local', available: true },

  { id: 'm9', name: 'Peppered Goat Meat', description: 'Slow-cooked spicy goat meat in rich tomato and pepper sauce', price: 8500, category: 'dinner', image: '/food-dinner.jpg', badge: 'Chef\'s Pick', available: true },
  { id: 'm10', name: 'Egusi Soup & Pounded Yam', description: 'Delicious egusi soup with goat meat, stockfish and pounded yam', price: 7500, category: 'dinner', image: '/food-dinner.jpg', badge: 'Popular', available: true },
  { id: 'm11', name: 'Seafood Okra Soup', description: 'Fresh seafood okra with crayfish, periwinkle and swallow of choice', price: 9000, category: 'dinner', image: '/food-dinner.jpg', available: true },
  { id: 'm12', name: 'Grilled Catfish & Plantain', description: 'Whole catfish marinated and grilled with spicy pepper sauce and fried plantain', price: 8000, category: 'dinner', image: '/food-dinner.jpg', available: true },

  { id: 'm13', name: 'Chapman Cocktail', description: 'Classic Nigerian Chapman with citrus, grenadine and soda water', price: 2000, category: 'drinks', image: '/food-drinks.jpg', badge: 'Signature', available: true },
  { id: 'm14', name: 'Fresh Zobo Drink', description: 'Chilled hibiscus flower drink with ginger, cloves and pineapple', price: 1500, category: 'drinks', image: '/food-drinks.jpg', available: true },
  { id: 'm15', name: 'Tropical Fruit Smoothie', description: 'Mango, pineapple, banana and orange blended with yogurt', price: 2500, category: 'drinks', image: '/food-drinks.jpg', available: true },
  { id: 'm16', name: 'Premium Cocktail Mix', description: 'Signature house cocktail with premium spirits and fresh tropical fruits', price: 4500, category: 'drinks', image: '/food-drinks.jpg', badge: 'Premium', available: true },
];

const initialRiders: Rider[] = [
  { id: 'r1', name: 'Emeka Okafor', email: 'emeka@gmail.com', phone: '08012345678', bikeNumber: 'ABJ-123-DP', licenseNumber: 'LIC-001', availability: 'available', totalDeliveries: 148, rating: 4.8, earnings: 450000, roleNumber: 1, loginPassword: 'riders1' },
  { id: 'r2', name: 'Chukwuemeka Eze', email: 'eze@gmail.com', phone: '08023456789', bikeNumber: 'LG-456-DP', licenseNumber: 'LIC-002', availability: 'busy', totalDeliveries: 97, rating: 4.6, earnings: 310000, roleNumber: 2, loginPassword: 'riders2' },
  { id: 'r3', name: 'Babatunde Afolabi', email: 'afolabi@gmail.com', phone: '08034567890', bikeNumber: 'KN-789-DP', licenseNumber: 'LIC-003', availability: 'offline', totalDeliveries: 203, rating: 4.9, earnings: 620000, roleNumber: 3, loginPassword: 'riders3' },
];

const initialSalesReps: SalesRep[] = [
  { id: 's1', name: 'Adaeze Okonkwo', email: 'adaeze@gmail.com', phone: '08011223344', address: 'Lagos, Nigeria', ordersHandled: 312, status: 'active', roleNumber: 1, loginPassword: 'salesrep1' },
  { id: 's2', name: 'Tunde Bakare', email: 'tunde@gmail.com', phone: '08022334455', address: 'Abuja, Nigeria', ordersHandled: 187, status: 'active', roleNumber: 2, loginPassword: 'salesrep2' },
];

const demoOrders: Order[] = [
  {
    id: 'ORD001',
    orderNumber: '#1001',
    customerId: 'cust_99',
    customerName: 'John Adebayo',
    customerEmail: 'john@email.com',
    customerPhone: '08055667788',
    deliveryAddress: '23 Lekki Phase 1, Lagos',
    landmark: 'Near Shoprite',
    items: [{ ...initialMenuItems[4], quantity: 2 }, { ...initialMenuItems[12], quantity: 1 }],
    subtotal: 15000,
    vat: 1125,
    deliveryFee: 1500,
    total: 17625,
    paymentMethod: 'paystack',
    paymentStatus: 'paid',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ORD002',
    orderNumber: '#1002',
    customerId: 'cust_98',
    customerName: 'Ngozi Eze',
    customerEmail: 'ngozi@email.com',
    customerPhone: '08066778899',
    deliveryAddress: '45 Maitama, Abuja',
    landmark: 'Near Transcorp Hilton',
    items: [{ ...initialMenuItems[8], quantity: 1 }, { ...initialMenuItems[9], quantity: 1 }],
    subtotal: 16000,
    vat: 1200,
    deliveryFee: 1500,
    total: 18700,
    paymentMethod: 'paystack',
    paymentStatus: 'paid',
    status: 'approved',
    salesRepId: 's1',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ORD003',
    orderNumber: '#1003',
    customerId: 'cust_97',
    customerName: 'Kemi Lawal',
    customerEmail: 'kemi@email.com',
    customerPhone: '08077889900',
    deliveryAddress: '12 GRA, Port Harcourt',
    landmark: 'Opp. First Bank',
    items: [{ ...initialMenuItems[5], quantity: 2 }],
    subtotal: 9000,
    vat: 675,
    deliveryFee: 1500,
    total: 11175,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    status: 'delivered',
    riderId: 'r3',
    riderName: 'Babatunde Afolabi',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialState: AppState = {
  user: null,
  cart: [],
  orders: loadStoredData<Order[]>('brybos_orders', demoOrders),
  menuItems: loadStoredData<MenuItem[]>('brybos_menu_items', initialMenuItems),
  riders: loadStoredData<Rider[]>('brybos_riders', initialRiders),
  salesReps: loadStoredData<SalesRep[]>('brybos_sales_reps', initialSalesReps),
  notifications: [
    {
      id: 'N1',
      type: 'success',
      title: 'New Order Received',
      message: 'Order #1001 from John Adebayo — ₦17,625',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      read: false,
    },
    {
      id: 'N2',
      type: 'info',
      title: 'Rider Assigned',
      message: 'Emeka Okafor assigned to Order #1002',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      read: false,
    },
  ],
  isCartOpen: false,
  currentPage: 'home',
  coupon: null,
  couponCode: '',
  unreadNotifications: 2,
  isSupabaseLive: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_SUPABASE_LIVE':
      return { ...state, isSupabaseLive: action.payload };

    case 'SET_MENU_ITEMS':
      return { ...state, menuItems: action.payload };

    case 'SET_ORDERS':
      return { ...state, orders: action.payload };

    case 'SET_RIDERS':
      return { ...state, riders: action.payload };

    case 'SET_SALES_REPS':
      return { ...state, salesReps: action.payload };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadNotifications: action.payload.filter(n => !n.read).length,
      };

    case 'ADD_TO_CART': {
      const existing = state.cart.find(i => String(i.id) === String(action.payload.id));
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(i => String(i.id) === String(action.payload.id) ? { ...i, quantity: i.quantity + 1 } : i),
          isCartOpen: true,
        };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, quantity: 1 }], isCartOpen: true };
    }

    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => String(i.id) !== String(action.payload)) };

    case 'UPDATE_CART_QTY':
      return {
        ...state,
        cart: action.payload.qty <= 0
          ? state.cart.filter(i => String(i.id) !== String(action.payload.id))
          : state.cart.map(i => String(i.id) === String(action.payload.id) ? { ...i, quantity: action.payload.qty } : i),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [], coupon: null };

    case 'TOGGLE_CART':
      return { ...state, isCartOpen: !state.isCartOpen };

    case 'CLOSE_CART':
      return { ...state, isCartOpen: false };

    case 'PLACE_ORDER': {
      const newOrders = [action.payload, ...state.orders];
      saveStoredData('brybos_orders', newOrders);
      return {
        ...state,
        orders: newOrders,
        cart: [],
        coupon: null,
      };
    }

    case 'UPDATE_ORDER_STATUS': {
      const newOrders = state.orders.map(o =>
        o.id === action.payload.id
          ? {
              ...o,
              status: action.payload.status,
              updatedAt: new Date().toISOString(),
              riderId: action.payload.riderId !== undefined ? action.payload.riderId : o.riderId,
              riderName: action.payload.riderName !== undefined ? action.payload.riderName : o.riderName,
            }
          : o
      );
      saveStoredData('brybos_orders', newOrders);
      return {
        ...state,
        orders: newOrders,
      };
    }

    case 'CANCEL_ORDER': {
      const newOrders: Order[] = state.orders.map(o =>
        o.id === action.payload ? { ...o, status: 'cancelled' as OrderStatus, updatedAt: new Date().toISOString() } : o
      );
      saveStoredData('brybos_orders', newOrders);
      return {
        ...state,
        orders: newOrders,
      };
    }

    case 'DELETE_ORDER': {
      const newOrders = state.orders.filter(o => o.id !== action.payload);
      saveStoredData('brybos_orders', newOrders);
      return {
        ...state,
        orders: newOrders,
      };
    }

    case 'ADD_NOTIFICATION': {
      const unread = state.notifications.filter(n => !n.read).length + 1;
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadNotifications: unread,
      };
    }

    case 'MARK_NOTIF_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n),
        unreadNotifications: Math.max(0, state.unreadNotifications - 1),
      };

    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadNotifications: 0,
      };

    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };

    case 'APPLY_COUPON':
      return { ...state, coupon: action.payload };

    case 'REMOVE_COUPON':
      return { ...state, coupon: null };

    case 'ADD_MENU_ITEM': {
      const newMenu = [...state.menuItems, action.payload];
      saveStoredData('brybos_menu_items', newMenu);
      return { ...state, menuItems: newMenu };
    }

    case 'UPDATE_MENU_ITEM': {
      const newMenu = state.menuItems.map(m => String(m.id) === String(action.payload.id) ? action.payload : m);
      saveStoredData('brybos_menu_items', newMenu);
      return { ...state, menuItems: newMenu };
    }

    case 'DELETE_MENU_ITEM': {
      const newMenu = state.menuItems.filter(m => String(m.id) !== String(action.payload));
      saveStoredData('brybos_menu_items', newMenu);
      return { ...state, menuItems: newMenu };
    }

    case 'ADD_RIDER': {
      const newRiders = [...state.riders, action.payload];
      saveStoredData('brybos_riders', newRiders);
      return { ...state, riders: newRiders };
    }

    case 'UPDATE_RIDER': {
      const newRiders = state.riders.map(r => String(r.id) === String(action.payload.id) ? action.payload : r);
      saveStoredData('brybos_riders', newRiders);
      return { ...state, riders: newRiders };
    }

    case 'DELETE_RIDER': {
      const newRiders = state.riders.filter(r => String(r.id) !== String(action.payload));
      saveStoredData('brybos_riders', newRiders);
      return { ...state, riders: newRiders };
    }

    case 'UPDATE_RIDER_STATUS': {
      const newRiders = state.riders.map(r =>
        String(r.id) === String(action.payload.id) ? { ...r, availability: action.payload.availability } : r
      );
      saveStoredData('brybos_riders', newRiders);
      return {
        ...state,
        riders: newRiders,
      };
    }

    case 'ADD_SALES_REP': {
      const newReps = [...state.salesReps, action.payload];
      saveStoredData('brybos_sales_reps', newReps);
      return { ...state, salesReps: newReps };
    }

    case 'UPDATE_SALES_REP': {
      const newReps = state.salesReps.map(s => String(s.id) === String(action.payload.id) ? action.payload : s);
      saveStoredData('brybos_sales_reps', newReps);
      return { ...state, salesReps: newReps };
    }

    case 'DELETE_SALES_REP': {
      const newReps = state.salesReps.filter(s => String(s.id) !== String(action.payload));
      saveStoredData('brybos_sales_reps', newReps);
      return { ...state, salesReps: newReps };
    }

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addNotification: (type: Notification['type'], title: string, message: string) => void;
  cartTotal: number;
  cartCount: number;
  discountAmount: number;
  grandTotal: number;
  VAT_RATE: number;
  DELIVERY_FEE: number;
  isSupabaseConfigured: boolean;
  isSupabaseLive: boolean;
  refreshData: () => Promise<void>;
  loading: boolean;
} | null>(null);

export const VALID_COUPONS: Coupon[] = [
  { code: 'BRYBOS10', discount: 10, type: 'percent' },
  { code: 'WELCOME500', discount: 500, type: 'flat' },
  { code: 'VIP20', discount: 20, type: 'percent' },
];

const VAT_RATE = 0.075;
const DELIVERY_FEE = 1500;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);

  const cartTotal = state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);

  const discountAmount = state.coupon
    ? state.coupon.type === 'percent'
      ? Math.round(cartTotal * state.coupon.discount / 100)
      : state.coupon.discount
    : 0;

  const discountedSubtotal = cartTotal - discountAmount;
  const vatAmount = Math.round(discountedSubtotal * VAT_RATE);
  const grandTotal = discountedSubtotal + vatAmount + (cartCount > 0 ? DELIVERY_FEE : 0);

  const addNotification = useCallback((type: Notification['type'], title: string, message: string) => {
    const notif: Notification = {
      id: `N${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notif });

    if (isSupabaseConfigured) {
      notificationService.createNotification({
        type,
        title,
        message,
        targetRole: 'all',
      }).catch(err => console.warn('Could not save notification to Supabase:', err));
    }
  }, []);

  // Intercept dispatch for Supabase sync
  const customDispatch = useCallback((action: Action) => {
    dispatch(action);

    // Background asynchronous sync to Supabase
    if (isSupabaseConfigured) {
      try {
        switch (action.type) {
          case 'PLACE_ORDER':
            orderService.createOrder(action.payload).catch(err => console.warn('Order sync warning:', err));
            break;
          case 'UPDATE_ORDER_STATUS':
            orderService.updateOrderStatus(action.payload.id, action.payload.status, {
              riderId: action.payload.riderId,
              riderName: action.payload.riderName,
            }).catch(err => console.warn('Order status sync warning:', err));
            break;
          case 'CANCEL_ORDER':
            orderService.cancelOrder(action.payload).catch(err => console.warn('Cancel order sync warning:', err));
            break;
          case 'DELETE_ORDER':
            orderService.deleteOrder(action.payload).catch(err => console.warn('Order delete sync warning:', err));
            break;
          case 'ADD_MENU_ITEM':
            menuService.createMenuItem(action.payload).catch(err => console.warn('Menu item create sync warning:', err));
            break;
          case 'UPDATE_MENU_ITEM':
            menuService.updateMenuItem(action.payload.id, action.payload).catch(err => console.warn('Menu item update sync warning:', err));
            break;
          case 'DELETE_MENU_ITEM':
            menuService.deleteMenuItem(action.payload).catch(err => console.warn('Menu item delete sync warning:', err));
            break;
          case 'ADD_RIDER':
            riderService.createRider(action.payload).catch(err => console.warn('Rider create sync warning:', err));
            break;
          case 'UPDATE_RIDER':
            riderService.updateRider(action.payload.id, action.payload).catch(err => console.warn('Rider update sync warning:', err));
            if (action.payload.email) {
              authService.updateStaffCredential(action.payload.email, {
                name: action.payload.name,
                phone: action.payload.phone,
              });
            }
            break;
          case 'UPDATE_RIDER_STATUS':
            riderService.updateRider(action.payload.id, { availability: action.payload.availability }).catch(err => console.warn('Rider status sync warning:', err));
            break;
          case 'DELETE_RIDER': {
            riderService.deleteRider(action.payload).catch(err => console.warn('Rider delete sync warning:', err));
            const riderMatch = state.riders.find(r => String(r.id) === String(action.payload));
            if (riderMatch?.email) {
              authService.removeStaffCredential(riderMatch.email);
            }
            break;
          }
          case 'ADD_SALES_REP':
            salesRepService.createSalesRep(action.payload).catch(err => console.warn('Sales rep create sync warning:', err));
            break;
          case 'UPDATE_SALES_REP':
            salesRepService.updateSalesRep(action.payload.id, action.payload).catch(err => console.warn('Sales rep update sync warning:', err));
            if (action.payload.email) {
              authService.updateStaffCredential(action.payload.email, {
                name: action.payload.name,
                phone: action.payload.phone,
              });
            }
            break;
          case 'DELETE_SALES_REP': {
            salesRepService.deleteSalesRep(action.payload).catch(err => console.warn('Sales rep delete sync warning:', err));
            const repMatch = state.salesReps.find(s => String(s.id) === String(action.payload));
            if (repMatch?.email) {
              authService.removeStaffCredential(repMatch.email);
            }
            break;
          }
          case 'MARK_NOTIF_READ':
            notificationService.markAsRead(action.payload).catch(err => console.warn('Mark notif read sync warning:', err));
            break;
          case 'MARK_ALL_READ':
            notificationService.markAllAsRead().catch(err => console.warn('Mark all notif read sync warning:', err));
            break;
        }
      } catch (err) {
        console.warn('Action sync error:', err);
      }
    }
  }, [state.riders, state.salesReps]);

  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Menu items
      const menuRes = await menuService.getMenuItems();
      if (menuRes.data && menuRes.data.length > 0) {
        dispatch({ type: 'SET_MENU_ITEMS', payload: menuRes.data });
        saveStoredData('brybos_menu_items', menuRes.data);
        dispatch({ type: 'SET_SUPABASE_LIVE', payload: true });
      }

      // 2. Orders
      const orderRes = await orderService.getOrders();
      if (orderRes.data && orderRes.data.length > 0) {
        dispatch({ type: 'SET_ORDERS', payload: orderRes.data });
        saveStoredData('brybos_orders', orderRes.data);
      }

      // 3. Riders
      const riderRes = await riderService.getRiders();
      if (riderRes.data && riderRes.data.length > 0) {
        dispatch({ type: 'SET_RIDERS', payload: riderRes.data });
        saveStoredData('brybos_riders', riderRes.data);
      }

      // 4. Sales reps
      const repRes = await salesRepService.getSalesReps();
      if (repRes.data && repRes.data.length > 0) {
        dispatch({ type: 'SET_SALES_REPS', payload: repRes.data });
        saveStoredData('brybos_sales_reps', repRes.data);
      }

      // 5. Notifications
      const notifRes = await notificationService.getNotifications();
      if (notifRes.data && notifRes.data.length > 0) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifRes.data });
      }
    } catch (err) {
      console.warn('Error refreshing Supabase data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial authentication & data load
  useEffect(() => {
    // Check current auth session
    authService.getCurrentSessionUser().then(user => {
      if (user) {
        dispatch({ type: 'SET_USER', payload: user });
      }
    });

    // Listen for auth changes
    const unsubAuth = authService.onAuthStateChange(user => {
      dispatch({ type: 'SET_USER', payload: user });
    });

    // Initial data fetch if Supabase configured
    if (isSupabaseConfigured) {
      refreshData();

      // Realtime subscriptions
      const unsubOrders = orderService.subscribeToOrders(() => {
        refreshData();
      });
      const unsubRiders = riderService.subscribeToRiders(() => {
        refreshData();
      });
      const unsubNotifs = notificationService.subscribeToNotifications(() => {
        refreshData();
      });

      return () => {
        unsubAuth();
        unsubOrders();
        unsubRiders();
        unsubNotifs();
      };
    }

    return () => {
      unsubAuth();
    };
  }, [refreshData]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch: customDispatch,
        addNotification,
        cartTotal,
        cartCount,
        discountAmount,
        grandTotal,
        VAT_RATE,
        DELIVERY_FEE,
        isSupabaseConfigured,
        isSupabaseLive: state.isSupabaseLive,
        refreshData,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
