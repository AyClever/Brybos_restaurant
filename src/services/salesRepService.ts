import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SalesRep } from '../types';

export const salesRepService = {
  async getSalesReps(): Promise<{ data: SalesRep[] | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: null, error: null };
    try {
      const { data, error } = await supabase
        .from('sales_reps')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped: SalesRep[] = (data || []).map((s: any) => ({
        id: s.id,
        profileId: s.profile_id,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        address: s.address || '',
        ordersHandled: Number(s.orders_handled || 0),
        status: s.status,
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      console.warn('Supabase sales_reps fetch error:', err.message);
      return { data: null, error: err.message };
    }
  },

  async createSalesRep(rep: Omit<SalesRep, 'id'>): Promise<{ data: SalesRep | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return {
        data: { id: Date.now(), ...rep },
        error: null,
      };
    }
    try {
      const { data, error } = await supabase
        .from('sales_reps')
        .insert({
          profile_id: (rep as any).profileId,
          name: rep.name,
          email: rep.email,
          phone: rep.phone,
          address: rep.address,
          orders_handled: rep.ordersHandled || 0,
          status: rep.status || 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return {
        data: {
          id: data.id,
          profileId: data.profile_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          ordersHandled: data.orders_handled,
          status: data.status,
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Error creating sales rep:', err);
      return { data: null, error: err.message };
    }
  },

  async updateSalesRep(id: string | number, updates: Partial<SalesRep>): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.email !== undefined) payload.email = updates.email;
      if ((updates as any).profileId !== undefined) payload.profile_id = (updates as any).profileId;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.ordersHandled !== undefined) payload.orders_handled = updates.ordersHandled;
      if (updates.status !== undefined) payload.status = updates.status;

      const { error } = await supabase
        .from('sales_reps')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error updating sales rep:', err);
      return { error: err.message };
    }
  },

  async deleteSalesRep(id: string | number): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase
        .from('sales_reps')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting sales rep:', err);
      return { error: err.message };
    }
  },
};
