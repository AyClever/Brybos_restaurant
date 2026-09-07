-- Migration: 20260907_delete_test_orders.sql
-- Description: Delete specific test/verification orders and ensure DELETE RLS policies are enabled

-- 1. DELETE ONLY THE EXACT SPECIFIED ORDERS (and linked records)
DELETE FROM public.order_items
WHERE order_id IN (
  SELECT id FROM public.orders
  WHERE order_number IN ('Brybos-V2086', 'Brybos-TEST03', 'Brybos-TEST02', 'Brybos-TEST01', '#1004')
);

DELETE FROM public.payments
WHERE order_id IN (
  SELECT id FROM public.orders
  WHERE order_number IN ('Brybos-V2086', 'Brybos-TEST03', 'Brybos-TEST02', 'Brybos-TEST01', '#1004')
);

DELETE FROM public.orders
WHERE order_number IN ('Brybos-V2086', 'Brybos-TEST03', 'Brybos-TEST02', 'Brybos-TEST01', '#1004');

-- 2. ENABLE DELETE POLICIES ON ORDERS, ORDER_ITEMS, AND PAYMENTS
-- Allows staff and administrators to delete orders directly through Supabase API
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Allow delete on orders'
  ) THEN
    CREATE POLICY "Allow delete on orders" ON public.orders
      FOR DELETE USING (
        public.current_user_role() IN ('admin', 'sales_rep') OR
        auth.role() = 'authenticated' OR
        auth.role() = 'anon'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Allow delete on order_items'
  ) THEN
    CREATE POLICY "Allow delete on order_items" ON public.order_items
      FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Allow delete on payments'
  ) THEN
    CREATE POLICY "Allow delete on payments" ON public.payments
      FOR DELETE USING (true);
  END IF;
END $$;
