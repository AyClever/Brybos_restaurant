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

const defaultStaffList: StaffCredential[] = [
  { email: 'emeka@gmail.com', password: 'riders1', name: 'Emeka Okafor', phone: '08012345678', role: 'rider', roleNumber: 1 },
  { email: 'eze@gmail.com', password: 'riders2', name: 'Chukwuemeka Eze', phone: '08023456789', role: 'rider', roleNumber: 2 },
  { email: 'afolabi@gmail.com', password: 'riders3', name: 'Babatunde Afolabi', phone: '08034567890', role: 'rider', roleNumber: 3 },
  { email: 'adaeze@gmail.com', password: 'salesrep1', name: 'Adaeze Okonkwo', phone: '08011223344', role: 'sales_rep', roleNumber: 1 },
  { email: 'tunde@gmail.com', password: 'salesrep2', name: 'Tunde Bakare', phone: '08022334455', role: 'sales_rep', roleNumber: 2 },
];

const getStoredStaff = (): StaffCredential[] => {
  try {
    const raw = localStorage.getItem('brybos_registered_staff');
    if (raw) return JSON.parse(raw);
    localStorage.setItem('brybos_registered_staff', JSON.stringify(defaultStaffList));
    return defaultStaffList;
  } catch {
    return defaultStaffList;
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

const removeStaffCredential = (emailOrId: string) => {
  try {
    const clean = emailOrId.toLowerCase().trim();
    const list = getStoredStaff().filter(s =>
      s.email.toLowerCase() !== clean &&
      `staff_${s.email.toLowerCase()}` !== clean
    );
    localStorage.setItem('brybos_registered_staff', JSON.stringify(list));
  } catch (e) {
    console.error('Error removing staff credential', e);
  }
};

const updateStaffCredential = (email: string, updates: Partial<StaffCredential>) => {
  try {
    const clean = email.toLowerCase().trim();
    const list = getStoredStaff().map(s => {
      if (s.email.toLowerCase() === clean) {
        return { ...s, ...updates };
      }
      return s;
    });
    localStorage.setItem('brybos_registered_staff', JSON.stringify(list));
  } catch (e) {
    console.error('Error updating staff credential', e);
  }
};

export const AUTH_STORAGE_KEY = 'brybos_auth_user';

export const getLocalAuthUser = (): User | null => {
  try {
    const s = localStorage.getItem(AUTH_STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

export const setLocalAuthUser = (user: User | null) => {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Could not persist auth user to localStorage:', e);
  }
};

export const authService = {
  getStoredStaff,
  saveStaffCredential,
  removeStaffCredential,
  updateStaffCredential,
  getLocalAuthUser,
  setLocalAuthUser,

  async getCurrentSessionUser(): Promise<User | null> {
    const cached = getLocalAuthUser();
    if (!isSupabaseConfigured) return cached;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        // Return persisted user (supports staff/admin logins or offline resilience)
        return cached;
      }

      const profile = await this.getProfile(session.user.id);
      const user: User = profile ? {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone || '',
        role: profile.role,
        avatar_url: profile.avatar_url,
      } : {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        phone: session.user.user_metadata?.phone || '',
        role: (session.user.user_metadata?.role as UserRole) || 'customer',
      };

      setLocalAuthUser(user);
      return user;
    } catch (err) {
      console.warn('Supabase getSession fallback to cache:', err);
      return cached;
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

      if (error) {
        console.warn('Supabase auth warning, using seamless customer registration:', error.message);
        // If Supabase hits email rate limit or fails, register customer locally so they are never blocked
        const localAcc = customerStore.save({
          id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: params.fullName.trim(),
          email: params.email.toLowerCase().trim(),
          phone: params.phone?.trim() || '',
          passwordHash: params.password,
          role: params.role || 'customer',
        });
        return {
          user: {
            id: localAcc.id,
            name: localAcc.name,
            email: localAcc.email,
            phone: localAcc.phone || '',
            role: 'customer',
          },
          error: null,
        };
      }
      if (!data.user) return { user: null, error: 'Registration failed. Please try again.' };

      // Also cache in customerStore for high reliability
      customerStore.save({
        id: data.user.id,
        name: params.fullName.trim(),
        email: params.email.toLowerCase().trim(),
        phone: params.phone?.trim() || '',
        passwordHash: params.password,
        role: params.role || 'customer',
      });

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
            const user: User = {
              id: data.user.id,
              name: profile?.full_name || 'Ayomipo Fayose',
              email: data.user.email || 'fayoseayomipo170@gmail.com',
              phone: profile?.phone || '08000000001',
              role: 'admin',
            };
            setLocalAuthUser(user);
            return { user, error: null };
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
      setLocalAuthUser(adminUser);
      return { user: adminUser, error: null };
    }

    // 2. CHECK REGISTERED STAFF (Sales Reps & Riders added by Admin)
    const storedStaff = getStoredStaff();
    const staffMatch = storedStaff.find(s => {
      if (s.email.toLowerCase() !== normEmail) return false;
      if (s.password === password) return true;
      // Also match rider credentials: riders<roleNumber> or rider<roleNumber> or salesrep<roleNumber>
      if (s.role === 'rider') {
        if (password === `riders${s.roleNumber}` || password === `rider${s.roleNumber}` || password === `salesrep${s.roleNumber}`) {
          return true;
        }
      }
      if (s.role === 'sales_rep') {
        if (password === `salesrep${s.roleNumber}`) {
          return true;
        }
      }
      return false;
    });
    if (staffMatch) {
      const user: User = {
        id: `staff_${staffMatch.email}`,
        name: staffMatch.name,
        email: staffMatch.email,
        phone: staffMatch.phone,
        role: staffMatch.role,
      };
      setLocalAuthUser(user);
      return {
        user,
        error: null,
      };
    }

    // 3. CHECK REGISTERED CUSTOMERS (Instant & always works without Supabase rate limits)
    const localCust = customerStore.find(normEmail, password);
    if (localCust) {
      const user: User = {
        id: localCust.id,
        name: localCust.name,
        email: localCust.email,
        phone: localCust.phone || '',
        role: 'customer',
      };
      setLocalAuthUser(user);
      return {
        user,
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
        const user: User = {
          id: data.user.id,
          name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
          phone: profile?.phone || data.user.user_metadata?.phone || '',
          role: (profile?.role || data.user.user_metadata?.role || 'customer') as UserRole,
        };
        setLocalAuthUser(user);
        return {
          user,
          error: null,
        };
      } catch (err: any) {
        return { user: null, error: err.message || 'Login failed.' };
      }
    }

    return { user: null, error: 'Invalid email or password. Please check your credentials.' };
  },

  async signOut(): Promise<void> {
    setLocalAuthUser(null);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setLocalAuthUser(null);
        callback(null);
      } else if (session?.user) {
        const profile = await this.getProfile(session.user.id);
        const user: User = {
          id: session.user.id,
          name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          phone: profile?.phone || session.user.user_metadata?.phone || '',
          role: (profile?.role || session.user.user_metadata?.role || 'customer') as UserRole,
        };
        setLocalAuthUser(user);
        callback(user);
      }
    });
    return () => subscription.unsubscribe();
  },
};
export interface LocalCustomerAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export const customerStore = {
  getAll(): LocalCustomerAccount[] {
    try {
      const raw = localStorage.getItem("brybos_registered_customers");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
  save(cust: Omit<LocalCustomerAccount, "createdAt">): LocalCustomerAccount {
    const all = this.getAll().filter(c => c.email.toLowerCase() !== cust.email.toLowerCase().trim());
    const record: LocalCustomerAccount = { ...cust, email: cust.email.toLowerCase().trim(), createdAt: new Date().toISOString() };
    all.push(record);
    try { localStorage.setItem("brybos_registered_customers", JSON.stringify(all)); } catch {}
    return record;
  },
  find(email: string, password?: string): LocalCustomerAccount | null {
    const custs = this.getAll();
    const found = custs.find(c => c.email.toLowerCase() === email.toLowerCase().trim());
    if (!found) return null;
    if (password !== undefined && found.passwordHash !== password) return null;
    return found;
  },
  delete(email: string): boolean {
    const normEmail = email.toLowerCase().trim();
    const all = this.getAll().filter(c => c.email.toLowerCase() !== normEmail);
    try { localStorage.setItem("brybos_registered_customers", JSON.stringify(all)); } catch {}
    if (isSupabaseConfigured) {
      Promise.resolve(supabase.from('profiles').delete().eq('email', normEmail)).catch(() => {});
    }
    return true;
  },
  update(email: string, updates: Partial<LocalCustomerAccount>): boolean {
    const all = this.getAll().map(c => {
      if (c.email.toLowerCase() === email.toLowerCase().trim()) {
        return { ...c, ...updates };
      }
      return c;
    });
    try { localStorage.setItem("brybos_registered_customers", JSON.stringify(all)); } catch {}
    return true;
  }
};

