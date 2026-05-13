
-- Remove permissive public SELECT policies on orders/payments
DROP POLICY IF EXISTS "Public can read orders for admin panel" ON public.orders;
DROP POLICY IF EXISTS "Public can read payments for admin panel" ON public.payments;

-- Remove orders/payments from realtime publication so anon cannot subscribe to PII
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.orders';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.payments';
  END IF;
END $$;
