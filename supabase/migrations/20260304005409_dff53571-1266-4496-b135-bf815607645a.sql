
-- Fix search_path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_payment_by_order(order_uuid UUID)
RETURNS TABLE (
  payment_id UUID,
  status TEXT,
  pix_key TEXT,
  qr_code_base64 TEXT,
  amount DECIMAL,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.status, p.pix_key, p.qr_code_base64, p.amount, p.expires_at
  FROM public.payments p
  WHERE p.order_id = order_uuid
  ORDER BY p.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SET search_path = public;
