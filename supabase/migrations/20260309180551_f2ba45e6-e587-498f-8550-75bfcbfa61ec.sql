
-- Restrict orders SELECT to service_role only (edge functions bypass RLS)
DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
CREATE POLICY "Allow service role read orders"
  ON public.orders
  FOR SELECT
  TO service_role
  USING (true);

-- Also restrict payments SELECT to service_role
DROP POLICY IF EXISTS "Allow public read payments" ON public.payments;
CREATE POLICY "Allow service role read payments"
  ON public.payments
  FOR SELECT
  TO service_role
  USING (true);
