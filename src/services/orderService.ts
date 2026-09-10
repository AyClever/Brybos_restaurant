import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Order, OrderStatus } from '../types';
import { generateBrybosOrderId, isUuid } from '../utils/orderUtils';

export interface NotificationResponse {
  success: boolean;
  duplicate?: boolean;
  orderNumber?: string;
  message?: string;
  error?: string;
  email?: {
    provider: string;
    success: boolean;
    status: string;
    recipient: string;
    messageId?: string;
    error?: string;
  };
  sms?: {
    provider: string;
    success: boolean;
    status: string;
    recipient: string;
    messageId?: string;
    error?: string;
  };
}

export const DELETED_ORDER_NUMBERS = [
  'Brybos-V2086',
  'Brybos-TEST03',
  'Brybos-TEST02',
  'Brybos-TEST01',
  '#1004',
  '1004',
  'ORD004',
];

export const orderService = {
  /**
   * Generates a guaranteed unique customer-facing Brybos order number: Brybos-XXXXXX
   * Verifies against Supabase orders table to prevent collisions.
   */
  async generateUniqueOrderNumber(): Promise<string> {
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateBrybosOrderId();
      if (!isSupabaseConfigured) return candidate;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', candidate)
          .limit(1);

        if (!error && (!data || data.length === 0)) {
          return candidate;
        }
      } catch {
        return candidate;
      }
      attempts++;
    }
    return generateBrybosOrderId();
  },

  /**
   * Fetches all orders from Supabase (source of truth) with their nested order_items
   */
  async getOrders(options?: {
    customerId?: string | number;
    customerEmail?: string;
    role?: string;
  }): Promise<{ data: Order[] | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: null, error: null };
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      // Customer view filtering: match by customer_id or customer_email
      if (options?.role === 'customer' && (options?.customerId || options?.customerEmail)) {
        if (options.customerId && options.customerEmail) {
          query = query.or(`customer_id.eq.${options.customerId},customer_email.eq.${options.customerEmail}`);
        } else if (options.customerId) {
          query = query.eq('customer_id', String(options.customerId));
        } else if (options.customerEmail) {
          query = query.eq('customer_email', options.customerEmail);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Order[] = (data || [])
        .filter((o: any) => !DELETED_ORDER_NUMBERS.includes(o.order_number) && !DELETED_ORDER_NUMBERS.includes(o.id))
        .map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number || generateBrybosOrderId(),
        customerId: o.customer_id,
        customerName: o.customer_name || 'Valued Guest',
        customerEmail: o.customer_email || '',
        customerPhone: o.customer_phone || '',
        deliveryAddress: o.delivery_address || '',
        landmark: o.landmark || '',
        items: (o.order_items || []).map((item: any) => ({
          id: item.menu_item_id || item.id,
          name: item.name || 'Order Item',
          description: '',
          price: Number(item.price || 0),
          category: 'lunch',
          image: item.image || '/food-rice.jpg',
          available: true,
          quantity: Number(item.quantity || 1),
        })),
        subtotal: Number(o.subtotal || 0),
        vat: Number(o.vat || 0),
        deliveryFee: Number(o.delivery_fee || 0),
        total: Number(o.total || 0),
        paymentMethod: o.payment_method || 'paystack',
        paymentStatus: o.payment_status || 'pending',
        status: (o.status || 'pending') as OrderStatus,
        riderId: o.rider_id,
        riderName: o.rider_name,
        salesRepId: o.sales_rep_id,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        estimatedTime: o.estimated_time || '30 - 45 mins',
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      console.warn('Could not fetch orders from Supabase:', err.message);
      return { data: null, error: err.message };
    }
  },

  /**
   * Creates an order permanently in Supabase:
   * 1. Generates unique Brybos-XXXXXX ID if not provided
   * 2. Inserts customer and order details to `orders` table
   * 3. Inserts all ordered items to `order_items` linked by `order_id`
   * 4. Inserts payment audit record into `payments` table
   */
  async createOrder(order: Partial<Order> & { items: any[] }): Promise<{ data: Order | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      const fallbackOrder: Order = {
        id: `ORD_${Date.now()}`,
        orderNumber: order.orderNumber || generateBrybosOrderId(),
        customerId: order.customerId ?? 0,
        customerName: order.customerName || 'Valued Customer',
        customerEmail: order.customerEmail || '',
        customerPhone: order.customerPhone || '',
        deliveryAddress: order.deliveryAddress || '',
        landmark: order.landmark || '',
        items: order.items || [],
        subtotal: order.subtotal || 0,
        vat: order.vat || 0,
        deliveryFee: order.deliveryFee || 0,
        total: order.total || 0,
        paymentMethod: order.paymentMethod || 'cash',
        paymentStatus: order.paymentStatus || 'pending',
        status: (order.status || 'pending') as OrderStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimatedTime: order.estimatedTime || '30 - 45 mins',
      };
      return { data: fallbackOrder, error: null };
    }

    try {
      // 1. Ensure customer-facing order ID format: Brybos-XXXXXX
      const orderNumber =
        order.orderNumber && order.orderNumber.startsWith('Brybos-')
          ? order.orderNumber
          : await this.generateUniqueOrderNumber();

      // Validate customer UUID
      const customerUuid = isUuid(order.customerId) ? (order.customerId as string) : null;

      // 2. Insert into orders table
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerUuid,
          customer_name: order.customerName?.trim() || 'Valued Guest',
          customer_email: order.customerEmail?.trim() || '',
          customer_phone: order.customerPhone?.trim() || '',
          delivery_address: order.deliveryAddress?.trim() || '',
          landmark: order.landmark?.trim() || '',
          subtotal: Number(order.subtotal || 0),
          vat: Number(order.vat || 0),
          delivery_fee: Number(order.deliveryFee || 0),
          total: Number(order.total || 0),
          payment_method: order.paymentMethod || 'cash',
          payment_status: order.paymentStatus || 'pending',
          status: order.status || 'pending',
          estimated_time: order.estimatedTime || '30 - 45 mins',
        })
        .select()
        .single();

      if (orderError) throw orderError;
      if (!createdOrder) throw new Error('Failed to create order record in Supabase.');

      // 3. Insert order items linked by order_id
      if (order.items && order.items.length > 0) {
        const itemsPayload = order.items.map(item => ({
          order_id: createdOrder.id,
          menu_item_id: isUuid(item.id) ? item.id : null,
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          image: item.image || '/food-rice.jpg',
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsError) {
          console.error('Error inserting order items:', itemsError.message);
        }
      }

      // 4. Record initial payment entry
      try {
        await supabase.from('payments').insert({
          order_id: createdOrder.id,
          customer_id: customerUuid,
          amount: Number(order.total || 0),
          payment_method: order.paymentMethod || 'cash',
          payment_status: order.paymentStatus || 'pending',
          transaction_ref: `TXN_${orderNumber}_${Date.now()}`,
        });
      } catch (payErr) {
        console.warn('Payment audit insert note:', payErr);
      }

      const completeOrder: Order = {
        id: createdOrder.id,
        orderNumber: createdOrder.order_number,
        customerId: createdOrder.customer_id,
        customerName: createdOrder.customer_name,
        customerEmail: createdOrder.customer_email,
        customerPhone: createdOrder.customer_phone,
        deliveryAddress: createdOrder.delivery_address,
        landmark: createdOrder.landmark || '',
        items: (order.items || []).map(i => ({
          id: i.id,
          name: i.name,
          description: i.description || '',
          price: Number(i.price),
          category: i.category || 'lunch',
          image: i.image || '/food-rice.jpg',
          available: true,
          quantity: Number(i.quantity || 1),
        })),
        subtotal: Number(createdOrder.subtotal),
        vat: Number(createdOrder.vat),
        deliveryFee: Number(createdOrder.delivery_fee),
        total: Number(createdOrder.total),
        paymentMethod: createdOrder.payment_method,
        paymentStatus: createdOrder.payment_status,
        status: createdOrder.status as OrderStatus,
        createdAt: createdOrder.created_at,
        updatedAt: createdOrder.updated_at,
        estimatedTime: createdOrder.estimated_time,
      };

      return { data: completeOrder, error: null };
    } catch (err: any) {
      console.error('Error creating order in Supabase:', err);
      return { data: null, error: err.message || 'Could not save order to database.' };
    }
  },

  /**
   * Securely triggers server-side order notifications (Email + SMS/WhatsApp).
   * Must ONLY be invoked AFTER order is successfully saved to Supabase!
   */
  async sendOrderNotifications(
    order: Order,
    options?: { forceRetry?: boolean }
  ): Promise<NotificationResponse> {
    try {
      const response = await fetch('/api/send-order-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          landmark: order.landmark,
          items: order.items.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
          subtotal: order.subtotal,
          vat: order.vat,
          deliveryFee: order.deliveryFee,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          createdAt: order.createdAt,
          forceRetry: options?.forceRetry || false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Notification service error (${response.status}): ${errText}`,
        };
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      console.warn('Could not reach notification service:', err);
      return {
        success: false,
        error: err.message || 'Notification service connection error',
      };
    }
  },

  /**
   * Updates order status in Supabase and synchronizes across all users.
   * Supports both UUID id and order_number lookups, with safety guards on rider/rep UUIDs.
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    extra?: { riderId?: string | number; riderName?: string; salesRepId?: string | number }
  ): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const payload: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (extra?.riderName !== undefined) {
        payload.rider_name = extra.riderName;
      }
      if (extra?.riderId !== undefined) {
        payload.rider_id = isUuid(extra.riderId) ? extra.riderId : null;
      }
      if (extra?.salesRepId !== undefined) {
        payload.sales_rep_id = isUuid(extra.salesRepId) ? extra.salesRepId : null;
      }

      let query = supabase.from('orders').update(payload);
      if (isUuid(orderId)) {
        query = query.eq('id', orderId);
      } else {
        query = query.eq('order_number', orderId);
      }

      const { error } = await query;
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error updating order status in Supabase:', err);
      return { error: err.message };
    }
  },

  async cancelOrder(orderId: string): Promise<{ error: string | null }> {
    return this.updateOrderStatus(orderId, 'cancelled');
  },

  /**
   * Deletes an order and its linked order items and payment records permanently from Supabase
   */
  async deleteOrder(orderId: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      let targetId = orderId;

      if (!isUuid(orderId)) {
        const { data: found } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', orderId)
          .single();
        if (found) targetId = found.id;
      }

      // 1. Delete linked items
      await supabase.from('order_items').delete().eq('order_id', targetId);

      // 2. Delete linked payment records
      await supabase.from('payments').delete().eq('order_id', targetId);

      // 3. Delete order
      const { error } = await supabase.from('orders').delete().eq('id', targetId);
      if (error) throw error;

      return { error: null };
    } catch (err: any) {
      console.error('Error deleting order from Supabase:', err);
      return { error: err.message };
    }
  },

  /**
   * Realtime subscription for instant live updates across Admin, Sales Rep, Rider, and Customer views
   */
  subscribeToOrders(callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel('public:orders:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => callback(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        payload => callback(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
