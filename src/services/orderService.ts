import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Order, OrderStatus } from '../types';

export const orderService = {
  async getOrders(options?: { customerId?: string | number; role?: string }): Promise<{ data: Order[] | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: null, error: null };
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (options?.customerId && options.role === 'customer') {
        query = query.eq('customer_id', options.customerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Order[] = (data || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        deliveryAddress: o.delivery_address,
        landmark: o.landmark || '',
        items: (o.order_items || []).map((item: any) => ({
          id: item.menu_item_id || item.id,
          name: item.name,
          description: '',
          price: Number(item.price),
          category: 'lunch',
          image: item.image || '/food-rice.jpg',
          available: true,
          quantity: item.quantity,
        })),
        subtotal: Number(o.subtotal),
        vat: Number(o.vat),
        deliveryFee: Number(o.delivery_fee),
        total: Number(o.total),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        status: o.status as OrderStatus,
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

  async createOrder(order: Order): Promise<{ data: Order | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: order, error: null };
    try {
      // 1. Insert order record
      const customerUuid = typeof order.customerId === 'string' && order.customerId.length > 20
        ? order.customerId
        : null;

      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: order.orderNumber,
          customer_id: customerUuid,
          customer_name: order.customerName,
          customer_email: order.customerEmail,
          customer_phone: order.customerPhone,
          delivery_address: order.deliveryAddress,
          landmark: order.landmark,
          subtotal: order.subtotal,
          vat: order.vat,
          delivery_fee: order.deliveryFee,
          total: order.total,
          payment_method: order.paymentMethod,
          payment_status: order.paymentStatus,
          status: order.status,
          estimated_time: order.estimatedTime || '30 - 45 mins',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert order items
      if (order.items && order.items.length > 0) {
        const itemsPayload = order.items.map(item => ({
          order_id: createdOrder.id,
          menu_item_id: typeof item.id === 'string' && item.id.length > 20 ? item.id : null,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsPayload);

        if (itemsError) console.warn('Order items insert warning:', itemsError.message);
      }

      // 3. Record initial payment record
      try {
        await supabase.from('payments').insert({
          order_id: createdOrder.id,
          customer_id: customerUuid,
          amount: order.total,
          payment_method: order.paymentMethod,
          payment_status: order.paymentStatus,
          transaction_ref: `TXN_${Date.now()}`,
        });
      } catch (payErr) {
        console.warn('Payment record insert note:', payErr);
      }

      // 4. Create admin notification
      try {
        await supabase.from('notifications').insert({
          target_role: 'admin',
          type: 'success',
          title: 'New Order Received',
          message: `Order ${order.orderNumber} from ${order.customerName} — ₦${order.total.toLocaleString()}`,
        });
      } catch (notifErr) {
        console.warn('Notification insert note:', notifErr);
      }

      return {
        data: {
          ...order,
          id: createdOrder.id,
          createdAt: createdOrder.created_at,
          updatedAt: createdOrder.updated_at,
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Error creating order in Supabase:', err);
      return { data: null, error: err.message };
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    extra?: { riderId?: string | number; riderName?: string; salesRepId?: string | number }
  ): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const payload: any = { status };
      if (extra?.riderId !== undefined) payload.rider_id = extra.riderId;
      if (extra?.riderName !== undefined) payload.rider_name = extra.riderName;
      if (extra?.salesRepId !== undefined) payload.sales_rep_id = extra.salesRepId;

      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', orderId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error updating order status:', err);
      return { error: err.message };
    }
  },

  async cancelOrder(orderId: string): Promise<{ error: string | null }> {
    return this.updateOrderStatus(orderId, 'cancelled');
  },

  async deleteOrder(orderId: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting order:', err);
      return { error: err.message };
    }
  },

  subscribeToOrders(callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return () => {};
    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => callback(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
