import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ===== TYPES =====
export type UserRole = 'customer' | 'admin' | 'sales_rep' | 'rider' | null;

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'drinks';
  image: string;
  badge?: string;
  available: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'approved' | 'assigned' | 'onway' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: number;
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
  riderId?: number;
  riderName?: string;
  salesRepId?: number;
  createdAt: string;
  updatedAt: string;
  estimatedTime?: string;
}

export interface Rider {
  id: number;
  name: string;
  phone: string;
  bikeNumber: string;
  licenseNumber: string;
  availability: 'available' | 'busy' | 'offline';
  totalDeliveries: number;
  rating: number;
  earnings: number;
  lat?: number;
  lng?: number;
}

export interface SalesRep {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  ordersHandled: number;
  status: 'active' | 'inactive';
}

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Coupon {
  code: string;
  discount: number;
  type: 'percent' | 'flat';
}

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
}

type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'ADD_TO_CART'; payload: MenuItem }
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'UPDATE_CART_QTY'; payload: { id: number; qty: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'PLACE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: OrderStatus; riderId?: number; riderName?: string } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIF_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'SET_PAGE'; payload: string }
  | { type: 'APPLY_COUPON'; payload: Coupon }
  | { type: 'REMOVE_COUPON' }
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem }
  | { type: 'UPDATE_MENU_ITEM'; payload: MenuItem }
  | { type: 'DELETE_MENU_ITEM'; payload: number }
  | { type: 'ADD_RIDER'; payload: Rider }
  | { type: 'UPDATE_RIDER'; payload: Rider }
  | { type: 'DELETE_RIDER'; payload: number }
  | { type: 'UPDATE_RIDER_STATUS'; payload: { id: number; availability: Rider['availability'] } }
  | { type: 'ADD_SALES_REP'; payload: SalesRep }
  | { type: 'UPDATE_SALES_REP'; payload: SalesRep }
  | { type: 'DELETE_SALES_REP'; payload: number }
  | { type: 'CANCEL_ORDER'; payload: string };

// ===== INITIAL DATA =====
const initialMenuItems: MenuItem[] = [
  { id: 1, name: 'Classic Pancake Stack', description: 'Fluffy golden pancakes with maple syrup, fresh berries and whipped cream', price: 3500, category: 'breakfast', image: '/food-breakfast.jpg', badge: 'Popular', available: true },
  { id: 2, name: 'Full English Breakfast', description: 'Eggs, grilled sausages, bacon, toast, grilled tomatoes and mushrooms', price: 4500, category: 'breakfast', image: '/food-breakfast.jpg', badge: 'Bestseller', available: true },
  { id: 3, name: 'Avocado Toast Special', description: 'Sourdough toast with smashed avocado, poached eggs and cherry tomatoes', price: 3200, category: 'breakfast', image: '/food-breakfast.jpg', available: true },
  { id: 4, name: 'Nigerian Akara & Pap', description: 'Freshly fried bean cakes served with smooth ogi and fresh pepper sauce', price: 2500, category: 'breakfast', image: '/food-breakfast.jpg', badge: 'Local', available: true },

  { id: 5, name: 'Signature Jollof Rice', description: 'Premium smoky party jollof rice with fried chicken and coleslaw', price: 6500, category: 'lunch', image: '/food-rice.jpg', badge: 'Bestseller', available: true },
  { id: 6, name: 'Grilled Chicken Burger', description: 'Spicy grilled chicken breast in sesame bun with fresh veggies and sauces', price: 4500, category: 'lunch', image: '/food-burger.jpg', badge: 'Spicy 🌶', available: true },
  { id: 7, name: 'Fried Rice & Assorted', description: 'Nigerian-style fried rice with chicken, shrimp and mixed vegetables', price: 6000, category: 'lunch', image: '/food-rice.jpg', available: true },
  { id: 8, name: 'Ofada Rice & Ayamase', description: 'Local brown rice with authentic ayamase sauce and assorted meats', price: 5500, category: 'lunch', image: '/food-rice.jpg', badge: 'Local', available: true },

  { id: 9, name: 'Peppered Goat Meat', description: 'Slow-cooked spicy goat meat in rich tomato and pepper sauce', price: 8500, category: 'dinner', image: '/food-dinner.jpg', badge: 'Chef\'s Pick', available: true },
  { id: 10, name: 'Egusi Soup & Pounded Yam', description: 'Delicious egusi soup with goat meat, stockfish and pounded yam', price: 7500, category: 'dinner', image: '/food-dinner.jpg', badge: 'Popular', available: true },
  { id: 11, name: 'Seafood Okra Soup', description: 'Fresh seafood okra with crayfish, periwinkle and swallow of choice', price: 9000, category: 'dinner', image: '/food-dinner.jpg', available: true },
  { id: 12, name: 'Grilled Catfish & Plantain', description: 'Whole catfish marinated and grilled with spicy pepper sauce and fried plantain', price: 8000, category: 'dinner', image: '/food-dinner.jpg', available: true },

  { id: 13, name: 'Chapman Cocktail', description: 'Classic Nigerian Chapman with citrus, grenadine and soda water', price: 2000, category: 'drinks', image: '/food-drinks.jpg', badge: 'Signature', available: true },
  { id: 14, name: 'Fresh Zobo Drink', description: 'Chilled hibiscus flower drink with ginger, cloves and pineapple', price: 1500, category: 'drinks', image: '/food-drinks.jpg', available: true },
  { id: 15, name: 'Tropical Fruit Smoothie', description: 'Mango, pineapple, banana and orange blended with yogurt', price: 2500, category: 'drinks', image: '/food-drinks.jpg', available: true },
  { id: 16, name: 'Premium Cocktail Mix', description: 'Signature house cocktail with premium spirits and fresh tropical fruits', price: 4500, category: 'drinks', image: '/food-drinks.jpg', badge: 'Premium', available: true },
];

const initialRiders: Rider[] = [
  { id: 1, name: 'Emeka Okafor', phone: '08012345678', bikeNumber: 'ABJ-123-DP', licenseNumber: 'LIC-001', availability: 'available', totalDeliveries: 148, rating: 4.8, earnings: 450000 },
  { id: 2, name: 'Chukwuemeka Eze', phone: '08023456789', bikeNumber: 'LG-456-DP', licenseNumber: 'LIC-002', availability: 'busy', totalDeliveries: 97, rating: 4.6, earnings: 310000 },
  { id: 3, name: 'Babatunde Afolabi', phone: '08034567890', bikeNumber: 'KN-789-DP', licenseNumber: 'LIC-003', availability: 'offline', totalDeliveries: 203, rating: 4.9, earnings: 620000 },
];

const initialSalesReps: SalesRep[] = [
  { id: 1, name: 'Adaeze Okonkwo', email: 'ada@brybos.com', phone: '08011223344', address: 'Lagos, Nigeria', ordersHandled: 312, status: 'active' },
  { id: 2, name: 'Tunde Bakare', email: 'tunde@brybos.com', phone: '08022334455', address: 'Abuja, Nigeria', ordersHandled: 187, status: 'active' },
];

const demoOrders: Order[] = [
  {
    id: 'ORD001',
    orderNumber: '#1001',
    customerId: 99,
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
    customerId: 98,
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
    salesRepId: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ORD003',
    orderNumber: '#1003',
    customerId: 97,
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
    riderId: 3,
    riderName: 'Babatunde Afolabi',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialState: AppState = {
  user: null,
  cart: [],
  orders: demoOrders,
  menuItems: initialMenuItems,
  riders: initialRiders,
  salesReps: initialSalesReps,
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
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'ADD_TO_CART': {
      const existing = state.cart.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(i => i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i),
          isCartOpen: true,
        };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, quantity: 1 }], isCartOpen: true };
    }

    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => i.id !== action.payload) };

    case 'UPDATE_CART_QTY':
      return {
        ...state,
        cart: action.payload.qty <= 0
          ? state.cart.filter(i => i.id !== action.payload.id)
          : state.cart.map(i => i.id === action.payload.id ? { ...i, quantity: action.payload.qty } : i),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [], coupon: null };

    case 'TOGGLE_CART':
      return { ...state, isCartOpen: !state.isCartOpen };

    case 'CLOSE_CART':
      return { ...state, isCartOpen: false };

    case 'PLACE_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        cart: [],
        coupon: null,
      };

    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.id
            ? {
                ...o,
                status: action.payload.status,
                updatedAt: new Date().toISOString(),
                riderId: action.payload.riderId ?? o.riderId,
                riderName: action.payload.riderName ?? o.riderName,
              }
            : o
        ),
      };

    case 'CANCEL_ORDER':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload ? { ...o, status: 'cancelled', updatedAt: new Date().toISOString() } : o
        ),
      };

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

    case 'ADD_MENU_ITEM':
      return { ...state, menuItems: [...state.menuItems, action.payload] };

    case 'UPDATE_MENU_ITEM':
      return { ...state, menuItems: state.menuItems.map(m => m.id === action.payload.id ? action.payload : m) };

    case 'DELETE_MENU_ITEM':
      return { ...state, menuItems: state.menuItems.filter(m => m.id !== action.payload) };

    case 'ADD_RIDER':
      return { ...state, riders: [...state.riders, action.payload] };

    case 'UPDATE_RIDER':
      return { ...state, riders: state.riders.map(r => r.id === action.payload.id ? action.payload : r) };

    case 'DELETE_RIDER':
      return { ...state, riders: state.riders.filter(r => r.id !== action.payload) };

    case 'UPDATE_RIDER_STATUS':
      return {
        ...state,
        riders: state.riders.map(r =>
          r.id === action.payload.id ? { ...r, availability: action.payload.availability } : r
        ),
      };

    case 'ADD_SALES_REP':
      return { ...state, salesReps: [...state.salesReps, action.payload] };

    case 'UPDATE_SALES_REP':
      return { ...state, salesReps: state.salesReps.map(s => s.id === action.payload.id ? action.payload : s) };

    case 'DELETE_SALES_REP':
      return { ...state, salesReps: state.salesReps.filter(s => s.id !== action.payload) };

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
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: `N${Date.now()}`,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
      },
    });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, addNotification, cartTotal, cartCount, discountAmount, grandTotal, VAT_RATE, DELIVERY_FEE }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
