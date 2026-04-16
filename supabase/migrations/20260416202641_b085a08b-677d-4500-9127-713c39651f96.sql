-- Adiciona número sequencial de pedido
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number BIGINT;

CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq;

ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT nextval('public.orders_order_number_seq');

-- Preenche pedidos antigos sem número, na ordem de criação
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE order_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.orders
      SET order_number = nextval('public.orders_order_number_seq')
      WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.orders
  ALTER COLUMN order_number SET NOT NULL;

ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders(order_number);