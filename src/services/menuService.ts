import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MenuItem } from '../types';

export const menuService = {
  async getMenuItems(): Promise<{ data: MenuItem[] | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: null, error: null };
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped: MenuItem[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: Number(item.price),
        category: item.category,
        image: item.image,
        badge: item.badge || undefined,
        available: Boolean(item.available),
        created_at: item.created_at,
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      console.warn('Supabase menu_items fetch error:', err.message);
      return { data: null, error: err.message };
    }
  },

  async createMenuItem(item: Omit<MenuItem, 'id'>): Promise<{ data: MenuItem | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return {
        data: { id: Date.now(), ...item },
        error: null,
      };
    }
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          badge: item.badge || null,
          available: item.available,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        data: {
          id: data.id,
          name: data.name,
          description: data.description || '',
          price: Number(data.price),
          category: data.category,
          image: data.image,
          badge: data.badge || undefined,
          available: Boolean(data.available),
          created_at: data.created_at,
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Error creating menu item:', err);
      return { data: null, error: err.message };
    }
  },

  async updateMenuItem(id: string | number, updates: Partial<MenuItem>): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.image !== undefined) payload.image = updates.image;
      if (updates.badge !== undefined) payload.badge = updates.badge || null;
      if (updates.available !== undefined) payload.available = updates.available;

      const { error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error updating menu item:', err);
      return { error: err.message };
    }
  },

  async deleteMenuItem(id: string | number): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting menu item:', err);
      return { error: err.message };
    }
  },

  async uploadMenuImage(file: File): Promise<{ url: string | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      // Create local object URL for preview if Supabase is offline
      return { url: URL.createObjectURL(file), error: null };
    }
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `menu/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      console.error('Failed to upload image to Supabase Storage:', err);
      return { url: URL.createObjectURL(file), error: err.message };
    }
  },
};
