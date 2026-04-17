-- 1. Adicionar colunas para numeração diária
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_date date,
  ADD COLUMN IF NOT EXISTS daily_order_number integer;

-- 2. Função para calcular o próximo número do dia
CREATE OR REPLACE FUNCTION public.set_daily_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_date IS NULL THEN
    NEW.order_date := CURRENT_DATE;
  END IF;

  IF NEW.daily_order_number IS NULL THEN
    SELECT COALESCE(MAX(daily_order_number), 0) + 1
      INTO NEW.daily_order_number
      FROM public.orders
     WHERE order_date = NEW.order_date;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trg_set_daily_order_number ON public.orders;
CREATE TRIGGER trg_set_daily_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_daily_order_number();

-- 4. Índice para acelerar o cálculo diário
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);

-- 5. Backfill de pedidos antigos (atribui números diários por dia, ordenados por created_at)
WITH numbered AS (
  SELECT id,
         (created_at AT TIME ZONE 'UTC')::date AS d,
         ROW_NUMBER() OVER (
           PARTITION BY (created_at AT TIME ZONE 'UTC')::date
           ORDER BY created_at
         ) AS rn
    FROM public.orders
   WHERE daily_order_number IS NULL OR order_date IS NULL
)
UPDATE public.orders o
   SET order_date = n.d,
       daily_order_number = n.rn
  FROM numbered n
 WHERE o.id = n.id;

-- 6. RLS: permitir SELECT público para o painel admin (proteção é por senha no client)
DROP POLICY IF EXISTS "Public can read orders for admin panel" ON public.orders;
CREATE POLICY "Public can read orders for admin panel"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

-- 7. RLS: permitir SELECT público para payments (mostrar status no painel)
DROP POLICY IF EXISTS "Public can read payments for admin panel" ON public.payments;
CREATE POLICY "Public can read payments for admin panel"
ON public.payments
FOR SELECT
TO anon, authenticated
USING (true);