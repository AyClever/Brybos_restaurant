import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Payment } from '../types';

export const paymentService = {
  async getPayments(): Promise<{ data: Payment[] | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: null, error: null };
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          orders (order_number, customer_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Payment[] = (data || []).map((p: any) => ({
        id: p.id,
        orderId: p.order_id,
        orderNumber: p.orders?.order_number,
        customerId: p.customer_id,
        customerName: p.orders?.customer_name,
        amount: Number(p.amount),
        paymentMethod: p.payment_method,
        paymentStatus: p.payment_status,
        transactionRef: p.transaction_ref,
        createdAt: p.created_at,
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      console.warn('Supabase payments fetch error:', err.message);
      return { data: null, error: err.message };
    }
  },

  async recordPayment(payment: {
    orderId: string;
    customerId?: string;
    amount: number;
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid' | 'failed';
    transactionRef?: string;
  }): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase.from('payments').insert({
        order_id: payment.orderId,
        customer_id: payment.customerId || null,
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        payment_status: payment.paymentStatus,
        transaction_ref: payment.transactionRef || `TXN_${Date.now()}`,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error recording payment:', err);
      return { error: err.message };
    }
  },
};
