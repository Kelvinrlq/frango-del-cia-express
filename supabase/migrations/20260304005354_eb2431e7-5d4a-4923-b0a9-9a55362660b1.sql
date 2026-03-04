
-- ============================================
-- TABELA DE PEDIDOS (ORDERS)
-- ============================================
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
  items JSONB NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'delivery'
    CHECK (order_type IN ('delivery', 'pickup')),
  delivery_info JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_email CHECK (customer_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (customer_phone ~ '^\d{10,11}$'),
  CONSTRAINT min_amount CHECK (total_amount > 0)
);

CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);

-- ============================================
-- TABELA DE PAGAMENTOS (PAYMENTS)
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  mercadopago_payment_id TEXT UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  method TEXT NOT NULL DEFAULT 'pix'
    CHECK (method IN ('pix', 'credit_card')),
  pix_key TEXT,
  qr_code TEXT,
  qr_code_base64 TEXT,
  payment_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT min_payment_amount CHECK (amount > 0),
  CONSTRAINT valid_status_expiry CHECK (
    (status = 'pending' AND expires_at IS NOT NULL) OR
    (status != 'pending')
  )
);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_mercadopago_id ON public.payments(mercadopago_payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_expires_at ON public.payments(expires_at);

-- ============================================
-- FUNCTIONS E TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read orders" ON public.orders 
  FOR SELECT USING (true);

CREATE POLICY "Allow insert orders" ON public.orders 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update orders" ON public.orders 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read payments" ON public.payments 
  FOR SELECT USING (true);

CREATE POLICY "Allow insert payments" ON public.payments 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update payments" ON public.payments 
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- FUNÇÃO AUXILIAR
-- ============================================
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
  SELECT 
    p.id,
    p.status,
    p.pix_key,
    p.qr_code_base64,
    p.amount,
    p.expires_at
  FROM public.payments p
  WHERE p.order_id = order_uuid
  ORDER BY p.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANTS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
