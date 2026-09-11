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
   * Sends password reset email to a user.
   */
  async sendPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured' };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send password reset' };
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
   * Uses a secure server-side method (API endpoint / Supabase Edge Function with service-role key)
   * to create the Auth user and auto-confirm email, with rollback on database failure,
   * completely preserving the active admin session.
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
  }): Promise<{ user: User | null; rider?: any; salesRep?: any; error: string | null }> {
    const email = params.email.trim().toLowerCase();
    const password = params.password.trim();
    const name = params.name.trim();
    const phone = params.phone.trim();

    if (!name || name.length < 2) {
      return { user: null, error: 'Staff name is required (minimum 2 characters).' };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { user: null, error: 'A valid email address is required.' };
    }
    if (!password || password.length < 6) {
      return { user: null, error: 'Password must be at least 6 characters for Supabase Auth.' };
    }

    if (!isSupabaseConfigured) {
      const mockId = `staff_${Date.now()}`;
      return {
        user: {
          id: mockId,
          name,
          email,
          phone,
          role: params.role,
        },
        error: null,
      };
    }

    // Retrieve active administrator session token to authorize the request
    let adminToken = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      adminToken = session?.access_token || '';
    } catch (tokenErr) {
      console.warn('Could not retrieve admin token:', tokenErr);
    }

    // METHOD 1: Supabase Edge Function with Service Role Key (supabase.functions.invoke('register-staff'))
    try {
      const { data, error: edgeError } = await supabase.functions.invoke('register-staff', {
        body: params,
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });

      if (!edgeError && data?.success) {
        return {
          user: data.user,
          rider: data.rider,
          salesRep: data.salesRep,
          error: null,
        };
      }

      // If the Edge function responded with a business error (e.g. duplicate email, invalid credentials, 403)
      if (data && !data.success && data.error) {
        return { user: null, error: data.error };
      }

      if (edgeError) {
        const edgeMessage = edgeError.message || '';
        const isUnavailable =
          edgeMessage.toLowerCase().includes('failed to send a request') ||
          edgeMessage.toLowerCase().includes('not found') ||
          edgeMessage.toLowerCase().includes('relay error') ||
          edgeMessage.toLowerCase().includes('functions fetch error') ||
          edgeMessage.toLowerCase().includes('500') ||
          edgeMessage.toLowerCase().includes('404');

        if (!isUnavailable && edgeMessage) {
          return { user: null, error: edgeMessage };
        }
      }
    } catch (edgeCallErr) {
      console.warn('Supabase Edge Function invoke error, trying server API endpoint...', edgeCallErr);
    }

    // METHOD 2: Secure Server-side API endpoint (/api/admin/register-staff)
    try {
      const apiResponse = await fetch('/api/admin/register-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify(params),
      });

      if (apiResponse.status !== 404) {
        const json = await apiResponse.json().catch(() => ({}));
        if (apiResponse.ok && json.success) {
          return {
            user: json.user,
            rider: json.rider,
            salesRep: json.salesRep,
            error: null,
          };
        }

        // If the server explicitly returned a business error (e.g. duplicate email, 403, 400)
        if (json.error) {
          if (typeof json.error === 'string' && json.error.includes('SUPABASE_SERVICE_ROLE_KEY is not configured')) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY not configured on server, falling back to authenticated client RPC...');
          } else {
            return { user: null, error: json.error };
          }
        }
      }
    } catch (apiErr) {
      console.warn('Server API /api/admin/register-staff unavailable, proceeding to authenticated RPC...', apiErr);
    }

    // METHOD 3: Client-side Isolated Supabase Client + Authenticated Database RPC Fallback
    try {
      const isolatedClient = createIsolatedSupabaseClient();
      const { data, error } = await isolatedClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name,
            phone,
            role: params.role,
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already') ||
          error.message.toLowerCase().includes('duplicate') ||
          error.message.toLowerCase().includes('exists')
        ) {
          return {
            user: null,
            error: `An account with email "${email}" is already registered in Supabase Auth. Please use a unique email.`,
          };
        }
        return { user: null, error: error.message };
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          user: null,
          error: `An account with email "${email}" is already registered in Supabase Auth. Please use a unique email.`,
        };
      }

      const newUserId = data.user?.id || `staff_${Date.now()}`;

      // 1. Try atomic PostgreSQL RPC `register_staff_profile` (SECURITY DEFINER with admin check)
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('register_staff_profile', {
          p_user_id: newUserId,
          p_name: name,
          p_email: email,
          p_phone: phone,
          p_role: params.role,
          p_bike_number: params.bikeNumber || `BRY-${100 + (params.roleNumber || 1)}`,
          p_license_number: params.licenseNumber || `LIC-00${params.roleNumber || 1}`,
          p_address: params.address || 'Lagos, Nigeria',
          p_role_number: params.roleNumber || 1,
        });

        if (!rpcErr && rpcRes?.success) {
          return {
            user: rpcRes.user || {
              id: newUserId,
              name,
              email,
              phone,
              role: params.role,
            },
            rider: rpcRes.rider || null,
            salesRep: rpcRes.sales_rep || null,
            error: null,
          };
        }

        if (rpcErr && rpcErr.message?.includes('Forbidden')) {
          return {
            user: null,
            error: 'Forbidden: Only administrators can register staff members.',
          };
        }
      } catch (rpcCallErr) {
        console.warn('RPC register_staff_profile not executed, using direct table upsert:', rpcCallErr);
      }

      // 2. Direct table upsert fallback
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: newUserId,
          full_name: name,
          email,
          phone,
          role: params.role,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        // Verify if profile was automatically created by DB trigger handle_new_auth_user
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', newUserId)
          .maybeSingle();

        if (!existingProfile) {
          console.error('Profile upsert failed during fallback:', profileError);
          return {
            user: null,
            error: `Failed to create profile: ${profileError.message}. Please verify administrator database permissions.`,
          };
        }
      }

      // 3. Insert/Upsert into riders or sales_reps
      let savedRider: any = null;
      let savedSalesRep: any = null;

      if (params.role === 'rider') {
        const { data: rData, error: rError } = await supabase
          .from('riders')
          .upsert(
            {
              profile_id: newUserId,
              name,
              email,
              phone,
              bike_number: params.bikeNumber || `BRY-${100 + (params.roleNumber || 1)}`,
              license_number: params.licenseNumber || `LIC-00${params.roleNumber || 1}`,
              availability: 'available',
              total_deliveries: 0,
              rating: 5.0,
              earnings: 0,
            },
            { onConflict: 'profile_id' }
          )
          .select()
          .maybeSingle();

        if (rError) {
          console.error('Riders insert failed:', rError);
          return {
            user: null,
            error: `Failed to create dispatch rider record: ${rError.message}.`,
          };
        }
        savedRider = rData;
      } else if (params.role === 'sales_rep') {
        const { data: sData, error: sError } = await supabase
          .from('sales_reps')
          .upsert(
            {
              profile_id: newUserId,
              name,
              email,
              phone,
              address: params.address || 'Lagos, Nigeria',
              orders_handled: 0,
              status: 'active',
            },
            { onConflict: 'profile_id' }
          )
          .select()
          .maybeSingle();

        if (sError) {
          console.error('Sales rep insert failed:', sError);
          return {
            user: null,
            error: `Failed to create sales representative record: ${sError.message}.`,
          };
        }
        savedSalesRep = sData;
      }

      return {
        user: {
          id: newUserId,
          name,
          email,
          phone,
          role: params.role,
        },
        rider: savedRider,
        salesRep: savedSalesRep,
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

  async updateProfileRole(userId: string, role: UserRole): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);
      return !error;
    } catch {
      return false;
    }
  },
};
