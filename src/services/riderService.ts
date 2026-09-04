import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Rider } from '../types';

export const riderService = {
  async getRiders(): Promise<{ data: Rider[] | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: null, error: null };
    try {
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped: Rider[] = (data || []).map((r: any) => ({
        id: r.id,
        profileId: r.profile_id,
        name: r.name,
        phone: r.phone,
        bikeNumber: r.bike_number || '',
        licenseNumber: r.license_number || '',
        availability: r.availability,
        totalDeliveries: Number(r.total_deliveries || 0),
        rating: Number(r.rating || 5.0),
        earnings: Number(r.earnings || 0),
        lat: r.lat ? Number(r.lat) : undefined,
        lng: r.lng ? Number(r.lng) : undefined,
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      console.warn('Supabase riders fetch error:', err.message);
      return { data: null, error: err.message };
    }
  },

  async createRider(rider: Omit<Rider, 'id'>): Promise<{ data: Rider | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return {
        data: { id: Date.now(), ...rider },
        error: null,
      };
    }
    try {
      const { data, error } = await supabase
        .from('riders')
        .insert({
          name: rider.name,
          phone: rider.phone,
          bike_number: rider.bikeNumber,
          license_number: rider.licenseNumber,
          availability: rider.availability || 'available',
          total_deliveries: rider.totalDeliveries || 0,
          rating: rider.rating || 5.0,
          earnings: rider.earnings || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        data: {
          id: data.id,
          name: data.name,
          phone: data.phone,
          bikeNumber: data.bike_number,
          licenseNumber: data.license_number,
          availability: data.availability,
          totalDeliveries: data.total_deliveries,
          rating: data.rating,
          earnings: data.earnings,
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Error creating rider:', err);
      return { data: null, error: err.message };
    }
  },

  async updateRider(id: string | number, updates: Partial<Rider>): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.bikeNumber !== undefined) payload.bike_number = updates.bikeNumber;
      if (updates.licenseNumber !== undefined) payload.license_number = updates.licenseNumber;
      if (updates.availability !== undefined) payload.availability = updates.availability;
      if (updates.totalDeliveries !== undefined) payload.total_deliveries = updates.totalDeliveries;
      if (updates.earnings !== undefined) payload.earnings = updates.earnings;
      if (updates.lat !== undefined) payload.lat = updates.lat;
      if (updates.lng !== undefined) payload.lng = updates.lng;

      const { error } = await supabase
        .from('riders')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error updating rider:', err);
      return { error: err.message };
    }
  },

  async deleteRider(id: string | number): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase
        .from('riders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting rider:', err);
      return { error: err.message };
    }
  },

  async updateRiderLocation(riderId: string | number, lat: number, lng: number): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('riders').update({ lat, lng }).eq('id', riderId);
      await supabase.from('rider_locations').upsert({
        rider_id: riderId,
        lat,
        lng,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to update rider location:', err);
    }
  },

  subscribeToRiders(callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return () => {};
    const channel = supabase
      .channel('public:riders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'riders' },
        (payload) => callback(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
