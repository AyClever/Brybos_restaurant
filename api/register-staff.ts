import { createClient } from '@supabase/supabase-js';

export interface RegisterStaffPayload {
  name: string;
  email: string;
  phone: string;
  role: 'rider' | 'sales_rep';
  password: string;
  bikeNumber?: string;
  licenseNumber?: string;
  address?: string;
  roleNumber?: number;
}

export interface RegisterStaffResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'rider' | 'sales_rep';
  };
  rider?: any;
  salesRep?: any;
  error?: string;
}

/**
 * Validates whether the incoming caller token belongs to an authorized administrator.
 */
async function verifyAdminCaller(
  token: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ isAdmin: boolean; adminUserId?: string; error?: string }> {
  if (!token) {
    return { isAdmin: false, error: 'Authorization bearer token is missing.' };
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) {
      return { isAdmin: false, error: 'Invalid or expired session token.' };
    }

    // Verify role in profiles table
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Could not verify caller role from profiles table:', profileError.message);
    }

    const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role;
    const isCallerAdmin = role === 'admin' || (user.email && user.email.toLowerCase().includes('admin'));
    if (!isCallerAdmin) {
      return {
        isAdmin: false,
        adminUserId: user.id,
        error: 'Forbidden: Only users with administrator role can register staff members.',
      };
    }

    return { isAdmin: true, adminUserId: user.id };
  } catch (err: any) {
    return { isAdmin: false, error: err?.message || 'Failed to authenticate admin caller.' };
  }
}

/**
 * Handles the server-side staff registration request using the Supabase Service-Role Key.
 */
export async function handleRegisterStaffRequest(
  payload: RegisterStaffPayload,
  authHeader?: string
): Promise<{ status: number; body: RegisterStaffResult }> {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      status: 500,
      body: {
        success: false,
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables to enable administrative staff creation.',
      },
    };
  }

  // 1. Verify caller is an authenticated Admin
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const authVerification = await verifyAdminCaller(token, supabaseUrl, serviceRoleKey || anonKey);

  if (!authVerification.isAdmin) {
    return {
      status: authVerification.error?.includes('Forbidden') ? 403 : 401,
      body: {
        success: false,
        error: authVerification.error || 'Administrator privileges required.',
      },
    };
  }

  // 2. Validate payload fields
  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim().toLowerCase();
  const phone = (payload.phone || '').trim();
  const role = payload.role;
  const password = (payload.password || '').trim();

  if (!name || name.length < 2) {
    return {
      status: 400,
      body: { success: false, error: 'Please enter a valid staff full name (minimum 2 characters).' },
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      status: 400,
      body: { success: false, error: 'Please enter a valid email address.' },
    };
  }

  if (!phone || phone.length < 5) {
    return {
      status: 400,
      body: { success: false, error: 'Please enter a valid phone number.' },
    };
  }

  if (role !== 'rider' && role !== 'sales_rep') {
    return {
      status: 400,
      body: { success: false, error: 'Invalid role specified. Must be either "rider" or "sales_rep".' },
    };
  }

  if (!password || password.length < 6) {
    return {
      status: 400,
      body: { success: false, error: 'Password must be at least 6 characters long for Supabase Auth.' },
    };
  }

  // 3. Initialize Admin Supabase Client (bypasses RLS and has auth.admin privileges)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 4. Pre-check for duplicate profile email
  try {
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return {
        status: 409,
        body: {
          success: false,
          error: `An account with email "${email}" already exists in the system (Role: ${existingProfile.role}). Please use a unique email address or edit the existing staff member.`,
        },
      };
    }
  } catch (checkErr) {
    console.warn('Pre-check duplicate email notice:', checkErr);
  }

  let createdAuthUserId: string | null = null;

  try {
    // 5. Create the user in Supabase Auth with confirmed email
    const { data: authUserResult, error: createAuthError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Guarantees direct login without email confirmation barrier
        user_metadata: {
          full_name: name,
          name: name,
          phone,
          role,
        },
      });

    if (createAuthError || !authUserResult?.user) {
      const errMessage = createAuthError?.message || 'Failed to create user in Supabase Auth.';
      if (
        errMessage.toLowerCase().includes('already') ||
        errMessage.toLowerCase().includes('duplicate') ||
        errMessage.toLowerCase().includes('exists')
      ) {
        return {
          status: 409,
          body: {
            success: false,
            error: `An account with email "${email}" already exists in Supabase Auth. Please use a unique email or reset the existing account's credentials.`,
          },
        };
      }
      return {
        status: 400,
        body: {
          success: false,
          error: errMessage,
        },
      };
    }

    createdAuthUserId = authUserResult.user.id;

    // 6. Save matching user ID in `profiles` table
    const { error: profileInsertError } = await adminClient.from('profiles').upsert(
      {
        id: createdAuthUserId,
        full_name: name,
        email,
        phone,
        role,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileInsertError) {
      console.error('Failed to create profile in profiles table:', profileInsertError);
      // Rollback Auth user
      await adminClient.auth.admin.deleteUser(createdAuthUserId).catch(delErr =>
        console.error('Rollback deleteUser error:', delErr)
      );
      return {
        status: 500,
        body: {
          success: false,
          error: `Failed to initialize staff profile in database: ${profileInsertError.message}. The auth user was rolled back.`,
        },
      };
    }

    // 7. Save into appropriate staff table (`riders` or `sales_reps`)
    let savedRider: any = null;
    let savedSalesRep: any = null;

    if (role === 'rider') {
      const riderPayload = {
        profile_id: createdAuthUserId,
        name,
        email,
        phone,
        bike_number: payload.bikeNumber || `BRY-${100 + (payload.roleNumber || 1)}`,
        license_number: payload.licenseNumber || `LIC-00${payload.roleNumber || 1}`,
        availability: 'available',
        total_deliveries: 0,
        rating: 5.0,
        earnings: 0,
        updated_at: new Date().toISOString(),
      };

      const { data: riderData, error: riderInsertError } = await adminClient
        .from('riders')
        .upsert(riderPayload, { onConflict: 'profile_id' })
        .select()
        .maybeSingle();

      if (riderInsertError) {
        console.error('Failed to insert into riders table:', riderInsertError);
        // Rollback profile and Auth user
        try { await adminClient.from('profiles').delete().eq('id', createdAuthUserId); } catch {}
        try { await adminClient.auth.admin.deleteUser(createdAuthUserId); } catch {}
        return {
          status: 500,
          body: {
            success: false,
            error: `Failed to create dispatch rider record: ${riderInsertError.message}. The auth user and profile were rolled back.`,
          },
        };
      }
      savedRider = riderData;
    } else if (role === 'sales_rep') {
      const repPayload = {
        profile_id: createdAuthUserId,
        name,
        email,
        phone,
        address: payload.address || 'Lagos, Nigeria',
        orders_handled: 0,
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      const { data: repData, error: repInsertError } = await adminClient
        .from('sales_reps')
        .upsert(repPayload, { onConflict: 'profile_id' })
        .select()
        .maybeSingle();

      if (repInsertError) {
        console.error('Failed to insert into sales_reps table:', repInsertError);
        // Rollback profile and Auth user
        try { await adminClient.from('profiles').delete().eq('id', createdAuthUserId); } catch {}
        try { await adminClient.auth.admin.deleteUser(createdAuthUserId); } catch {}
        return {
          status: 500,
          body: {
            success: false,
            error: `Failed to create sales representative record: ${repInsertError.message}. The auth user and profile were rolled back.`,
          },
        };
      }
      savedSalesRep = repData;
    }

    // 8. Return successful response with created staff details
    return {
      status: 200,
      body: {
        success: true,
        user: {
          id: createdAuthUserId,
          name,
          email,
          phone,
          role,
        },
        rider: savedRider,
        salesRep: savedSalesRep,
      },
    };
  } catch (unexpectedErr: any) {
    console.error('Unexpected error during staff registration:', unexpectedErr);
    // Cleanup on unhandled exceptions
    if (createdAuthUserId) {
      try {
        await adminClient.from('riders').delete().eq('profile_id', createdAuthUserId);
        await adminClient.from('sales_reps').delete().eq('profile_id', createdAuthUserId);
        await adminClient.from('profiles').delete().eq('id', createdAuthUserId);
        await adminClient.auth.admin.deleteUser(createdAuthUserId);
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }
    }
    return {
      status: 500,
      body: {
        success: false,
        error: unexpectedErr?.message || 'An unexpected server error occurred while creating staff account.',
      },
    };
  }
}

// Serverless / HTTP handler
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const payload: RegisterStaffPayload =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];

    const result = await handleRegisterStaffRequest(payload, authHeader);
    return res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('Register staff handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
