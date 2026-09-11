-- ==============================================================================
-- MIGRATION: 20260911_fix_profiles_rls_and_registration.sql
-- Fixes: "new row violates row-level security policy for table profiles"
-- Ensures:
-- 1. Non-recursive current_user_role() and is_admin() functions
-- 2. Explicit INSERT, SELECT, UPDATE, DELETE policies on profiles for users, admins, and service_role
-- 3. Explicit policies on riders and sales_reps for staff creation
-- 4. Secure RPC function `register_staff_profile` for atomic admin registration
-- 5. Safe trigger for auto-profile creation on auth.users insert
-- ==============================================================================

-- 1. HELPER FUNCTIONS FOR RLS (Non-recursive, safe, fast)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
DECLARE
  jwt_role TEXT;
  profile_role TEXT;
BEGIN
  -- 1. First inspect JWT claims (user_metadata or app_metadata).
  -- This is instant in memory and prevents any recursion on public.profiles table.
  jwt_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role'
  );
  IF jwt_role IS NOT NULL AND jwt_role <> '' THEN
    RETURN jwt_role;
  END IF;

  -- 2. Direct lookup in profiles table with SECURITY DEFINER
  SELECT p.role INTO profile_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(profile_role, 'customer');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'customer';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Helper to check if caller has administrative privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Check JWT metadata first
  v_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role'
  );
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check profiles table
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. RESET AND RE-ESTABLISH PROFILES RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users and admins" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users and staff" ON public.profiles;

-- SELECT: Users view own profile; Admins & Sales reps view all; Service role views all
CREATE POLICY "Profiles select policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR
    public.is_admin() OR
    public.current_user_role() IN ('admin', 'sales_rep') OR
    auth.role() = 'service_role'
  );

-- INSERT:
-- a) Users can insert their own profile (self-registration)
-- b) Admins can insert any profile (registering riders, sales reps, staff)
-- c) Service role can insert any profile
CREATE POLICY "Profiles insert policy" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR
    public.is_admin() OR
    auth.role() = 'service_role'
  );

-- UPDATE: Users can update own profile; Admins can update any; Service role can update any
CREATE POLICY "Profiles update policy" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    public.is_admin() OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.uid() = id OR
    public.is_admin() OR
    auth.role() = 'service_role'
  );

-- DELETE: Admins and service_role can delete profiles
CREATE POLICY "Profiles delete policy" ON public.profiles
  FOR DELETE USING (
    public.is_admin() OR
    auth.role() = 'service_role'
  );

-- 3. RESET AND RE-ESTABLISH RIDERS RLS POLICIES
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view riders" ON public.riders;
DROP POLICY IF EXISTS "Admins can manage riders" ON public.riders;
DROP POLICY IF EXISTS "Riders can update own availability" ON public.riders;
DROP POLICY IF EXISTS "Riders select policy" ON public.riders;
DROP POLICY IF EXISTS "Riders insert policy" ON public.riders;
DROP POLICY IF EXISTS "Riders update policy" ON public.riders;
DROP POLICY IF EXISTS "Riders delete policy" ON public.riders;

CREATE POLICY "Riders select policy" ON public.riders
  FOR SELECT USING (true);

CREATE POLICY "Riders insert policy" ON public.riders
  FOR INSERT WITH CHECK (
    public.is_admin() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Riders update policy" ON public.riders
  FOR UPDATE USING (
    public.is_admin() OR
    profile_id = auth.uid() OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    public.is_admin() OR
    profile_id = auth.uid() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Riders delete policy" ON public.riders
  FOR DELETE USING (
    public.is_admin() OR
    auth.role() = 'service_role'
  );

-- 4. RESET AND RE-ESTABLISH SALES_REPS RLS POLICIES
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view sales reps" ON public.sales_reps;
DROP POLICY IF EXISTS "Admins can manage sales reps" ON public.sales_reps;
DROP POLICY IF EXISTS "Sales reps select policy" ON public.sales_reps;
DROP POLICY IF EXISTS "Sales reps insert policy" ON public.sales_reps;
DROP POLICY IF EXISTS "Sales reps update policy" ON public.sales_reps;
DROP POLICY IF EXISTS "Sales reps delete policy" ON public.sales_reps;

CREATE POLICY "Sales reps select policy" ON public.sales_reps
  FOR SELECT USING (
    public.is_admin() OR
    public.current_user_role() IN ('admin', 'sales_rep') OR
    profile_id = auth.uid() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Sales reps insert policy" ON public.sales_reps
  FOR INSERT WITH CHECK (
    public.is_admin() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Sales reps update policy" ON public.sales_reps
  FOR UPDATE USING (
    public.is_admin() OR
    profile_id = auth.uid() OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    public.is_admin() OR
    profile_id = auth.uid() OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Sales reps delete policy" ON public.sales_reps
  FOR DELETE USING (
    public.is_admin() OR
    auth.role() = 'service_role'
  );

-- 5. ATOMIC STAFF REGISTRATION RPC (SECURITY DEFINER)
-- Allows authenticated admins to atomically create/link profile and rider/sales_rep records
CREATE OR REPLACE FUNCTION public.register_staff_profile(
  p_user_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_role TEXT,
  p_bike_number TEXT DEFAULT NULL,
  p_license_number TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_role_number INT DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_rider RECORD;
  v_sales_rep RECORD;
BEGIN
  -- Permission check: caller must be admin or service_role
  IF NOT public.is_admin() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: Only administrators can register staff members.';
  END IF;

  -- 1. Insert/Update matching row in profiles table
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    status,
    updated_at
  )
  VALUES (
    p_user_id,
    p_name,
    p_email,
    p_phone,
    p_role,
    'active',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    status = 'active',
    updated_at = NOW();

  -- 2. Insert/Update into riders or sales_reps table
  IF p_role = 'rider' THEN
    INSERT INTO public.riders (
      profile_id,
      name,
      email,
      phone,
      bike_number,
      license_number,
      availability,
      total_deliveries,
      rating,
      earnings,
      updated_at
    )
    VALUES (
      p_user_id,
      p_name,
      p_email,
      p_phone,
      COALESCE(p_bike_number, 'BRY-' || (100 + p_role_number)::TEXT),
      COALESCE(p_license_number, 'LIC-00' || p_role_number::TEXT),
      'available',
      0,
      5.0,
      0,
      NOW()
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      bike_number = COALESCE(EXCLUDED.bike_number, public.riders.bike_number),
      license_number = COALESCE(EXCLUDED.license_number, public.riders.license_number),
      updated_at = NOW()
    RETURNING * INTO v_rider;

    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', p_user_id,
        'name', p_name,
        'email', p_email,
        'phone', p_phone,
        'role', p_role
      ),
      'rider', row_to_json(v_rider)
    );

  ELSIF p_role = 'sales_rep' THEN
    INSERT INTO public.sales_reps (
      profile_id,
      name,
      email,
      phone,
      address,
      orders_handled,
      status,
      updated_at
    )
    VALUES (
      p_user_id,
      p_name,
      p_email,
      p_phone,
      COALESCE(p_address, 'Lagos, Nigeria'),
      0,
      'active',
      NOW()
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = COALESCE(EXCLUDED.address, public.sales_reps.address),
      updated_at = NOW()
    RETURNING * INTO v_sales_rep;

    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', p_user_id,
        'name', p_name,
        'email', p_email,
        'phone', p_phone,
        'role', p_role
      ),
      'sales_rep', row_to_json(v_sales_rep)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', p_user_id,
      'name', p_name,
      'email', p_email,
      'phone', p_phone,
      'role', p_role
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_staff_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT) TO authenticated, service_role;

-- 6. IMPROVED TRIGGER FUNCTION FOR NEW AUTH USERS
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    role = COALESCE(NULLIF(EXCLUDED.role, 'customer'), public.profiles.role),
    updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_auth_user notice: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
