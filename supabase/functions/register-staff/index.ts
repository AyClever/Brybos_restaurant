// Supabase Edge Function: register-staff
// Follows standard Supabase Deno runtime patterns

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not configured on server.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Verify caller is an authenticated Administrator
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const callerClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired caller session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller role in profiles
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', callerUser.id)
      .maybeSingle();

    const callerRole = callerProfile?.role || callerUser.user_metadata?.role;
    if (callerRole !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Only administrators can register staff members.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse payload
    const payload = await req.json();
    const name = (payload.name || '').trim();
    const email = (payload.email || '').trim().toLowerCase();
    const phone = (payload.phone || '').trim();
    const role = payload.role;
    const password = (payload.password || '').trim();

    if (!name || name.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid full name.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid email address.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone || phone.length < 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid phone number.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (role !== 'rider' && role !== 'sales_rep') {
      return new Response(
        JSON.stringify({ success: false, error: 'Role must be either "rider" or "sales_rep".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create user in Supabase Auth with auto-confirmed email
    const { data: newAuthData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        name,
        phone,
        role,
      },
    });

    if (createAuthError || !newAuthData?.user) {
      const msg = createAuthError?.message || 'Failed to create user in Supabase Auth.';
      const isDuplicate = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('exists');
      return new Response(
        JSON.stringify({
          success: false,
          error: isDuplicate
            ? `An account with email "${email}" already exists in Supabase Auth. Please use a unique email.`
            : msg,
        }),
        {
          status: isDuplicate ? 409 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const createdUserId = newAuthData.user.id;

    // 4. Save to profiles
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: createdUserId,
        full_name: name,
        email,
        phone,
        role,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      // Rollback Auth user
      await adminClient.auth.admin.deleteUser(createdUserId);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create profile: ${profileError.message}. Auth user was rolled back.`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Save to riders or sales_reps
    let savedRider = null;
    let savedSalesRep = null;

    if (role === 'rider') {
      const riderPayload = {
        profile_id: createdUserId,
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

      const { data: rData, error: rError } = await adminClient
        .from('riders')
        .upsert(riderPayload, { onConflict: 'profile_id' })
        .select()
        .maybeSingle();

      if (rError) {
        // Rollback
        await adminClient.from('profiles').delete().eq('id', createdUserId);
        await adminClient.auth.admin.deleteUser(createdUserId);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to create rider record: ${rError.message}. Auth user was rolled back.`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      savedRider = rData;
    } else if (role === 'sales_rep') {
      const repPayload = {
        profile_id: createdUserId,
        name,
        email,
        phone,
        address: payload.address || 'Lagos, Nigeria',
        orders_handled: 0,
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      const { data: sData, error: sError } = await adminClient
        .from('sales_reps')
        .upsert(repPayload, { onConflict: 'profile_id' })
        .select()
        .maybeSingle();

      if (sError) {
        // Rollback
        await adminClient.from('profiles').delete().eq('id', createdUserId);
        await adminClient.auth.admin.deleteUser(createdUserId);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to create sales rep record: ${sError.message}. Auth user was rolled back.`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      savedSalesRep = sData;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: createdUserId, name, email, phone, role },
        rider: savedRider,
        salesRep: savedSalesRep,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
