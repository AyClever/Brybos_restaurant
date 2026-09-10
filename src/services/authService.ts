import { supabase, createIsolatedSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { User, Profile, UserRole } from '../types';

export type { User, Profile, UserRole };

// Clean up any legacy insecure plain-text credentials that may exist in browser storage
export const cleanupLegacyInsecureAuth = () => {
  try {
    localStorage.removeItem('brybos_auth_user');
    localStorage.removeItem('brybos_registered_staff');
    localStorage.removeItem('brybos_registered_customers');
  } catch {}
};

// Run cleanup immediately
cleanupLegacyInsecureAuth();

export const authService = {
  /**
   * Retrieves the active user session directly from Supabase Auth.
   * Supabase Auth securely manages token refresh and persistence in localStorage.
   */
  async getCurrentSessionUser(): Promise<User | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        return null;
      }

      // Fetch user profile from Supabase profiles table for accurate RBAC
      const profile = await this.getProfile(session.user.id);

      const user: User = {
        id: session.user.id,
        email: session.user.email || profile?.email || '',
        name:
          profile?.full_name ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'User',
        phone: profile?.phone || session.user.user_metadata?.phone || '',
        role: (profile?.role || session.user.user_metadata?.role || 'customer') as UserRole,
        avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
      };

      return user;
    } catch (err) {
      console.error('Error in getCurrentSessionUser:', err);
      return null;
    }
  },

  /**
   * Fetches profile from Supabase `profiles` table.
   */
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch profile from Supabase:', error.message);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  },

  /**
   * Signs in a user using Supabase Auth as the single source of truth.
   * Validates credentials against Supabase and retrieves their verified role.
   */
  async signIn(params: {
    email: string;
    password: string;
  }): Promise<{ user: User | null; error: string | null }> {
    const email = params.email.trim().toLowerCase();
    const password = params.password.trim();

    if (!email || !password) {
      return { user: null, error: 'Email and password are required.' };
    }

    if (!isSupabaseConfigured) {
      return {
        user: null,
        error: 'Supabase credentials are not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'User authentication failed.' };
      }

      // Fetch the verified profile to determine RBAC role
      let profile = await this.getProfile(data.user.id);

      // If profile record doesn't exist yet, create or update it from user metadata
      if (!profile) {
        const metadataRole = (data.user.user_metadata?.role as UserRole) || 'customer';
        const fullName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          email.split('@')[0];
        const phone = data.user.user_metadata?.phone || '';

        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            phone,
            role: metadataRole,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        profile = newProfile as Profile | null;
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || email,
        name:
          profile?.full_name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          email.split('@')[0],
        phone: profile?.phone || data.user.user_metadata?.phone || '',
        role: (profile?.role || data.user.user_metadata?.role || 'customer') as UserRole,
        avatar_url: profile?.avatar_url || data.user.user_metadata?.avatar_url,
      };

      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || 'An unexpected error occurred during sign in.' };
    }
  },

  /**
   * Resends signup email confirmation to the specified address.
   */
  async resendConfirmationEmail(email: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured' };
    }
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to resend confirmation email' };
    }
  },

  /**
   * Registers a customer account using Supabase Auth.
   * Strictly enforces 'customer' role for public registrations.
   */
  async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role?: UserRole;
  }): Promise<{ user: User | null; error: string | null }> {
    const email = params.email.trim().toLowerCase();
    const password = params.password.trim();
    const fullName = params.fullName.trim();
    const phone = params.phone.trim();
    const role: UserRole = params.role || 'customer';

    if (!email || !password || !fullName) {
      return { user: null, error: 'Full name, email, and password are required.' };
    }

    if (!isSupabaseConfigured) {
      return {
        user: null,
        error: 'Supabase credentials are not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role,
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'Registration failed. Please try again.' };
      }

      // Upsert profile record in profiles table
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email,
          phone,
          role,
          status: 'active',
          updated_at: new Date().toISOString(),
        });
      } catch (upsertErr) {
        console.warn('Profile upsert notice:', upsertErr);
      }

      // Check if email confirmation is required by Supabase project settings
      if (data.user && !data.session) {
        return {
          user: null,
          error: 'Registration successful! Please check your email to confirm your account before logging in.',
        };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || email,
        name: fullName,
        phone,
        role,
      };

      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || 'An unexpected error occurred during registration.' };
    }
  },

  /**
   * Registers a staff member (Sales Rep or Rider) in Supabase.
   * Called by an authenticated Administrator.
   * Uses an isolated Supabase client to avoid disturbing the admin's active session.
   */
  async registerStaff(params: {
    name: string;
    email: string;
    phone: string;
    role: 'sales_rep' | 'rider';
    roleNumber: number;
    password: string;
    bikeNumber?: string;
    licenseNumber?: string;
    address?: string;
  }): Promise<{ user: User | null; error: string | null }> {
    const email = params.email.trim().toLowerCase();
    const password = params.password.trim();
    const name = params.name.trim();
    const phone = params.phone.trim();

    if (!isSupabaseConfigured) {
      return {
        user: {
          id: `staff_${Date.now()}`,
          name,
          email,
          phone,
          role: params.role,
        },
        error: null,
      };
    }

    try {
      // 1. Create Supabase Auth user without modifying the admin's active session
      const isolatedClient = createIsolatedSupabaseClient();
      const { data, error } = await isolatedClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
            role: params.role,
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      const newUserId = data.user?.id || `staff_${Date.now()}`;

      // 2. Ensure profile exists in profiles table with correct role
      await supabase.from('profiles').upsert({
        id: newUserId,
        full_name: name,
        email,
        phone,
        role: params.role,
        status: 'active',
        updated_at: new Date().toISOString(),
      });

      // 3. Upsert into riders or sales_reps table
      if (params.role === 'rider') {
        await supabase.from('riders').upsert({
          profile_id: newUserId,
          name,
          phone,
          bike_number: params.bikeNumber || `BRY-${100 + params.roleNumber}`,
          license_number: params.licenseNumber || `LIC-00${params.roleNumber}`,
          availability: 'available',
          total_deliveries: 0,
          rating: 5.0,
          earnings: 0,
        });
      } else if (params.role === 'sales_rep') {
        await supabase.from('sales_reps').upsert({
          profile_id: newUserId,
          name,
          email,
          phone,
          address: params.address || 'Lagos, Nigeria',
          orders_handled: 0,
          status: 'active',
        });
      }

      return {
        user: {
          id: newUserId,
          name,
          email,
          phone,
          role: params.role,
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Error registering staff:', err);
      return { user: null, error: err.message || 'Failed to create staff account.' };
    }
  },

  /**
   * Signs out the current user and terminates the Supabase Auth session.
   */
  async signOut(): Promise<void> {
    cleanupLegacyInsecureAuth();
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during signOut:', err);
      }
    }
  },

  /**
   * Subscribes to Supabase Auth state changes (sign in, sign out, token refresh).
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    if (!isSupabaseConfigured) {
      return () => {};
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        callback(null);
      } else {
        const profile = await this.getProfile(session.user.id);
        const user: User = {
          id: session.user.id,
          email: session.user.email || profile?.email || '',
          name:
            profile?.full_name ||
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'User',
          phone: profile?.phone || session.user.user_metadata?.phone || '',
          role: (profile?.role || session.user.user_metadata?.role || 'customer') as UserRole,
          avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
        };
        callback(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  /**
   * Customer profiles management for Admin Dashboard.
   * Directly queries Supabase profiles table.
   */
  async getCustomers(): Promise<Profile[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Error in getCustomers:', err);
      return [];
    }
  },

  async updateCustomer(idOrEmail: string, updates: { full_name?: string; phone?: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${idOrEmail},email.eq.${idOrEmail}`);

      return !error;
    } catch (err) {
      console.error('Error updating customer:', err);
      return false;
    }
  },

  async deleteCustomer(idOrEmail: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .or(`id.eq.${idOrEmail},email.eq.${idOrEmail}`);

      return !error;
    } catch (err) {
      console.error('Error deleting customer:', err);
      return false;
    }
  },
};
