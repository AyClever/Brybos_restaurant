-- ==============================================================================
-- BRYBOS RESTAURANT - COMPLETE SUPABASE SCHEMA & SECURITY POLICIES
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked directly to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'sales_rep', 'rider')) DEFAULT 'customer',
  avatar_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'drinks')),
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  image TEXT NOT NULL,
  badge TEXT,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(available);

-- 4. RIDERS
CREATE TABLE IF NOT EXISTS public.riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  bike_number TEXT,
  license_number TEXT,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'busy', 'offline')) DEFAULT 'available',
  total_deliveries INT NOT NULL DEFAULT 0,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
  earnings NUMERIC(12, 2) NOT NULL DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_riders_availability ON public.riders(availability);
CREATE INDEX IF NOT EXISTS idx_riders_profile_id ON public.riders(profile_id);

-- 5. SALES REPRESENTATIVES
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  orders_handled INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_reps_status ON public.sales_reps(status);
CREATE INDEX IF NOT EXISTS idx_sales_reps_profile_id ON public.sales_reps(profile_id);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  landmark TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'paystack',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'preparing', 'approved', 'assigned', 'onway', 'delivered', 'cancelled')) DEFAULT 'pending',
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  rider_name TEXT,
  sales_rep_id UUID REFERENCES public.sales_reps(id) ON DELETE SET NULL,
  estimated_time TEXT DEFAULT '30 - 45 mins',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
  transaction_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_role TEXT CHECK (target_role IN ('all', 'admin', 'sales_rep', 'rider', 'customer')) DEFAULT 'all',
  type TEXT NOT NULL CHECK (type IN ('success', 'info', 'warning', 'error')) DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 10. RIDER LIVE LOCATIONS
CREATE TABLE IF NOT EXISTS public.rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_locations_rider_id ON public.rider_locations(rider_id);

-- 11. RESTAURANT SETTINGS
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  restaurant_name TEXT NOT NULL DEFAULT 'BRYBOS Restaurant',
  phone TEXT DEFAULT '+234 800 BRYBOS (279267)',
  email TEXT DEFAULT 'hello@brybos.ng',
  address TEXT DEFAULT '12 Restaurant Lane, Lekki Phase 1, Lagos, Nigeria',
  vat_rate NUMERIC(4, 3) NOT NULL DEFAULT 0.075,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 1500,
  currency TEXT DEFAULT 'NGN',
  currency_symbol TEXT DEFAULT '₦',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_menu_categories_updated_at ON public.menu_categories;
CREATE TRIGGER set_menu_categories_updated_at BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER set_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_riders_updated_at ON public.riders;
CREATE TRIGGER set_riders_updated_at BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_sales_reps_updated_at ON public.sales_reps;
CREATE TRIGGER set_sales_reps_updated_at BEFORE UPDATE ON public.sales_reps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- AUTOMATIC NEW USER -> PROFILE TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Helper functions for RLS checks (Non-recursive and safe)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
DECLARE
  jwt_role TEXT;
  profile_role TEXT;
BEGIN
  jwt_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role'
  );
  IF jwt_role IS NOT NULL AND jwt_role <> '' THEN
    RETURN jwt_role;
  END IF;

  SELECT p.role INTO profile_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(profile_role, 'customer');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'customer';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  v_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role'
  );
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Profiles select policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR
    public.is_admin() OR
    public.current_user_role() IN ('admin', 'sales_rep') OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Profiles insert policy" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR
    public.is_admin() OR
    auth.role() = 'service_role'
  );

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

CREATE POLICY "Profiles delete policy" ON public.profiles
  FOR DELETE USING (
    public.is_admin() OR
    auth.role() = 'service_role'
  );

-- 2. MENU ITEMS & CATEGORIES POLICIES
-- Anyone can view available menu items; Admins can manage all menu items
CREATE POLICY "Public can view menu items" ON public.menu_items
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage menu items" ON public.menu_items
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "Public can view categories" ON public.menu_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.menu_categories
  FOR ALL USING (public.current_user_role() = 'admin');

-- 3. ORDERS POLICIES
-- Customers can view their own orders
CREATE POLICY "Customers can view own orders" ON public.orders
  FOR SELECT USING (
    auth.uid() = customer_id OR
    public.current_user_role() IN ('admin', 'sales_rep') OR
    (public.current_user_role() = 'rider' AND rider_id IN (SELECT id FROM public.riders WHERE profile_id = auth.uid()))
  );

-- Authenticated users (and guests checking out) can insert orders
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Admins and Sales Reps can update orders; Riders can update their assigned orders
CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'sales_rep') OR
    (public.current_user_role() = 'rider' AND rider_id IN (SELECT id FROM public.riders WHERE profile_id = auth.uid()))
  );

-- 4. ORDER ITEMS POLICIES
CREATE POLICY "View order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        o.customer_id = auth.uid() OR
        public.current_user_role() IN ('admin', 'sales_rep') OR
        (public.current_user_role() = 'rider' AND o.rider_id IN (SELECT id FROM public.riders WHERE profile_id = auth.uid()))
      )
    )
  );

CREATE POLICY "Create order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- 5. RIDERS POLICIES
CREATE POLICY "Staff can view riders" ON public.riders
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage riders" ON public.riders
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "Riders can update own availability" ON public.riders
  FOR UPDATE USING (profile_id = auth.uid());

-- 6. SALES REPS POLICIES
CREATE POLICY "Staff can view sales reps" ON public.sales_reps
  FOR SELECT USING (public.current_user_role() IN ('admin', 'sales_rep'));

CREATE POLICY "Admins can manage sales reps" ON public.sales_reps
  FOR ALL USING (public.current_user_role() = 'admin');

-- 7. PAYMENTS POLICIES
CREATE POLICY "View payments" ON public.payments
  FOR SELECT USING (
    auth.uid() = customer_id OR
    public.current_user_role() IN ('admin', 'sales_rep')
  );

CREATE POLICY "Create payments" ON public.payments
  FOR INSERT WITH CHECK (true);

-- 8. NOTIFICATIONS POLICIES
CREATE POLICY "View notifications" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    target_role = 'all' OR
    target_role = public.current_user_role() OR
    public.current_user_role() = 'admin'
  );

CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE USING (
    user_id = auth.uid() OR public.current_user_role() = 'admin'
  );

CREATE POLICY "Insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- 9. RIDER LOCATIONS POLICIES
CREATE POLICY "Public/Staff view rider locations" ON public.rider_locations
  FOR SELECT USING (true);

CREATE POLICY "Riders update own location" ON public.rider_locations
  FOR ALL USING (
    rider_id IN (SELECT id FROM public.riders WHERE profile_id = auth.uid()) OR
    public.current_user_role() = 'admin'
  );

-- 10. RESTAURANT SETTINGS POLICIES
CREATE POLICY "Public view restaurant settings" ON public.restaurant_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins manage restaurant settings" ON public.restaurant_settings
  FOR ALL USING (public.current_user_role() = 'admin');

-- ==============================================================================
-- STORAGE BUCKET: product-images
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read images
CREATE POLICY "Public Access product-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Admins can upload, update, delete images
CREATE POLICY "Admin Upload product-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.current_user_role() = 'admin');

CREATE POLICY "Admin Update product-images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND public.current_user_role() = 'admin');

CREATE POLICY "Admin Delete product-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND public.current_user_role() = 'admin');
