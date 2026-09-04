import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Profile, UserRole } from '../types';

export interface StaffCredential {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'sales_rep' | 'rider';
  roleNumber: number;
}

const getStoredStaff = (): StaffCredential[] => {
  try {
    const raw = localStorage.getItem('brybos_registered_staff');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStaffCredential = (cred: StaffCredential) => {
  try {
    const list = getStoredStaff().filter(s => s.email.toLowerCase() !== cred.email.toLowerCase());
    list.push(cred);
    localStorage.setItem('brybos_registered_staff', JSON.stringify(list));
  } catch (e) {
    console.error('Error saving staff credential', e);
  }
};

export const authService = {
  getStoredStaff,
  saveStaffCredential,

  async getCurrentSessionUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;

      const profile = await this.getProfile(session.user.id);
      if (profile) {
        return {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone || '',
          role: profile.role,
          avatar_url: profile.avatar_url,
        };
      }

      // Fallback from user metadata if profile query fails
      return {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        phone: session.user.user_metadata?.phone || '',
        role: (session.user.user_metadata?.role as UserRole) || 'customer',
      };
    } catch (err) {
      console.error('Failed to get Supabase session user:', err);
      return null;
    }
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('Could not fetch profile from Supabase:', error.message);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Error in getProfile:', err);
      return null;
    }
  },

  async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role?: UserRole;
  }): Promise<{ user: User | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return {
        user: {
          id: `demo_${Date.now()}`,
          name: params.fullName,
          email: params.email,
          phone: params.phone,
          role: params.role || 'customer',
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName,
            phone: params.phone,
            role: params.role || 'customer',
          },
        },
      });

      if (error) return { user: null, error: error.message };
      if (!data.user) return { user: null, error: 'Registration failed. Please try again.' };

      // Ensure profile exists in profiles table
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: params.fullName,
          email: params.email,
          phone: params.phone,
          role: params.role || 'customer',
          status: 'active',
        });
      } catch (upsertErr) {
        console.warn('Profile upsert warning (trigger may have handled it):', upsertErr);
      }

      return {
        user: {
          id: data.user.id,
          name: params.fullName,
          email: params.email,
          phone: params.phone,
          role: params.role || 'customer',
        },
        error: null,
      };
    } catch (err: any) {
      return { user: null, error: err.message || 'An unexpected error occurred.' };
    }
  },

  async registerStaff(params: {
    name: string;
    email: string;
    phone: string;
    role: 'sales_rep' | 'rider';
    roleNumber: number;
    password: string;
  }): Promise<{ user: User | null; error: string | null }> {
    // 1. Save to local staff store
    saveStaffCredential({
      email: params.email.toLowerCase(),
      password: params.password,
      name: params.name,
      phone: params.phone,
      role: params.role,
      roleNumber: params.roleNumber,
    });

    // 2. If Supabase is configured, create Auth account and profile
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.name,
              phone: params.phone,
              role: params.role,
            },
          },
        });

        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: params.name,
            email: params.email,
            phone: params.phone,
            role: params.role,
            status: 'active',
          });
        }
      } catch (err) {
        console.warn('Supabase staff signup error (local fallback active):', err);
      }
    }

    return {
      user: {
        id: `staff_${Date.now()}`,
        name: params.name,
        email: params.email,
        phone: params.phone,
        role: params.role,
      },
      error: null,
    };
  },

  async signIn(params: {
    email: string;
    password: string;
  }): Promise<{ user: User | null; error: string | null }> {
    const normEmail = params.email.trim().toLowerCase();
    const password = params.password.trim();

    // 1. DEDICATED ADMIN LOGIN
    // Specifically matches requested credentials: fayoseayomipo170@gmail.com / Admin123
    if (normEmail === 'fayoseayomipo170@gmail.com' && (password === 'Admin123' || password === 'admin123')) {
      const adminUser: User = {
        id: 'admin_fayose_01',
        name: 'Ayomipo Fayose',
        email: 'fayoseayomipo170@gmail.com',
        phone: '08000000001',
        role: 'admin',
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'fayoseayomipo170@gmail.com',
            password: params.password,
          });

          if (data?.user) {
            const profile = await this.getProfile(data.user.id);
            return {
              user: {
                id: data.user.id,
                name: profile?.full_name || 'Ayomipo Fayose',
                email: data.user.email || 'fayoseayomipo170@gmail.com',
                phone: profile?.phone || '08000000001',
                role: 'admin',
              },
              error: null,
            };
          } else if (error) {
            // Auto register in Supabase Auth if not yet created
            const { data: signUpData } = await supabase.auth.signUp({
              email: 'fayoseayomipo170@gmail.com',
              password: params.password,
              options: {
                data: { full_name: 'Ayomipo Fayose', role: 'admin', phone: '08000000001' },
              },
            });
            if (signUpData?.user) {
              await supabase.from('profiles').upsert({
                id: signUpData.user.id,
                full_name: 'Ayomipo Fayose',
                email: 'fayoseayomipo170@gmail.com',
                phone: '08000000001',
                role: 'admin',
                status: 'active',
              });
            }
          }
        } catch (err) {
          console.warn('Supabase admin login fallback:', err);
        }
      }
      return { user: adminUser, error: null };
    }

    // 2. CHECK REGISTERED STAFF (Sales Reps & Riders added by Admin)
    const storedStaff = getStoredStaff();
    const staffMatch = storedStaff.find(s => s.email.toLowerCase() === normEmail && s.password === password);
    if (staffMatch) {
      return {
        user: {
          id: `staff_${staffMatch.email}`,
          name: staffMatch.name,
          email: staffMatch.email,
          phone: staffMatch.phone,
          role: staffMatch.role,
        },
        error: null,
      };
    }

    // 3. CHECK SEED / DEMO STAFF CREDENTIALS
    const seedStaff: Record<string, { role: UserRole; name: string; phone: string; pass: string[] }> = {
      'admin@brybos.com': { role: 'admin', name: 'Admin User', phone: '08000000001', pass: ['admin123', 'Admin123'] },
      'ada@brybos.com': { role: 'sales_rep', name: 'Adaeze Okonkwo', phone: '08011223344', pass: ['salesrep1', 'rep123'] },
      'adaeze@gmail.com': { role: 'sales_rep', name: 'Adaeze Okonkwo', phone: '08011223344', pass: ['salesrep1', 'rep123'] },
      'tunde@brybos.com': { role: 'sales_rep', name: 'Tunde Bakare', phone: '08022334455', pass: ['salesrep2', 'rep123'] },
      'tunde@gmail.com': { role: 'sales_rep', name: 'Tunde Bakare', phone: '08022334455', pass: ['salesrep2', 'rep123'] },
      'rep@brybos.com': { role: 'sales_rep', name: 'Adaeze Okonkwo', phone: '08011223344', pass: ['salesrep1', 'rep123'] },
      'emeka@gmail.com': { role: 'rider', name: 'Emeka Okafor', phone: '08012345678', pass: ['salesrep1', 'rider1', 'rider123'] },
      'rider@brybos.com': { role: 'rider', name: 'Emeka Okafor', phone: '08012345678', pass: ['salesrep1', 'rider1', 'rider123'] },
      'eze@gmail.com': { role: 'rider', name: 'Chukwuemeka Eze', phone: '08023456789', pass: ['salesrep2', 'rider2', 'rider123'] },
      'afolabi@gmail.com': { role: 'rider', name: 'Babatunde Afolabi', phone: '08034567890', pass: ['salesrep3', 'rider3', 'rider123'] },
      'customer@brybos.com': { role: 'customer', name: 'John Adebayo', phone: '08055667788', pass: ['cust123', 'password'] },
    };

    const seedUser = seedStaff[normEmail];
    if (seedUser && seedUser.pass.includes(password)) {
      return {
        user: {
          id: `demo_${normEmail}`,
          name: seedUser.name,
          email: normEmail,
          phone: seedUser.phone,
          role: seedUser.role,
        },
        error: null,
      };
    }

    // 4. SUPABASE AUTHENTICATION
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: params.email,
          password: params.password,
        });

        if (error) return { user: null, error: error.message };
        if (!data.user) return { user: null, error: 'User not found.' };

        const profile = await this.getProfile(data.user.id);
        return {
          user: {
            id: data.user.id,
            name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || '',
            phone: profile?.phone || data.user.user_metadata?.phone || '',
            role: (profile?.role || data.user.user_metadata?.role || 'customer') as UserRole,
          },
          error: null,
        };
      } catch (err: any) {
        return { user: null, error: err.message || 'Login failed.' };
      }
    }

    return { user: null, error: 'Invalid email or password. Please check your credentials.' };
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    if (!isSupabaseConfigured) return () => {};
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
      } else {
        const profile = await this.getProfile(session.user.id);
        callback({
          id: session.user.id,
          name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          phone: profile?.phone || session.user.user_metadata?.phone || '',
          role: (profile?.role || session.user.user_metadata?.role || 'customer') as UserRole,
        });
      }
    });
    return () => subscription.unsubscribe();
  },
};
