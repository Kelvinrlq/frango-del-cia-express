-- 0. Ampliar CHECK constraint para aceitar status em português + 'paid'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status = ANY (ARRAY[
    'pending'::text,
    'pending_cash'::text, 'pending_debit'::text, 'pending_credit'::text,
    'pending_dinheiro'::text, 'pending_debito'::text, 'pending_credito'::text,
    'paid'::text, 'completed'::text, 'failed'::text, 'cancelled'::text
  ]));

-- 1. Renomear statuses legados em inglês para português
UPDATE public.orders SET payment_status = 'pending_dinheiro' WHERE payment_status = 'pending_cash';
UPDATE public.orders SET payment_status = 'pending_debito'   WHERE payment_status = 'pending_debit';
UPDATE public.orders SET payment_status = 'pending_credito'  WHERE payment_status = 'pending_credit';

-- 2. Função transacional: marcar pagamento como aprovado
CREATE OR REPLACE FUNCTION public.mark_payment_approved(
  p_payment_id uuid,
  p_mp_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  UPDATE public.payments
     SET status = 'approved', payment_details = p_mp_data, updated_at = now()
   WHERE id = p_payment_id
   RETURNING order_id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  UPDATE public.orders
     SET payment_status = 'paid', updated_at = now()
   WHERE id = v_order_id;
END;
$$;

-- 3. Função genérica para sincronizar qualquer status
CREATE OR REPLACE FUNCTION public.sync_payment_status(
  p_payment_id uuid,
  p_payment_status text,
  p_order_status text,
  p_mp_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  UPDATE public.payments
     SET status = p_payment_status, payment_details = p_mp_data, updated_at = now()
   WHERE id = p_payment_id
   RETURNING order_id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  UPDATE public.orders
     SET payment_status = p_order_status, updated_at = now()
   WHERE id = v_order_id;
END;
$$;

-- 4. Corrigir pedidos com pagamento approved mas order ainda pending
UPDATE public.orders o
   SET payment_status = 'paid', updated_at = now()
  FROM public.payments p
 WHERE p.order_id = o.id
   AND p.status = 'approved'
   AND o.payment_status NOT IN ('paid', 'completed', 'cancelled', 'failed');

-- 5. Políticas DELETE restritas a service_role
DROP POLICY IF EXISTS "Service role can delete orders" ON public.orders;
CREATE POLICY "Service role can delete orders"
  ON public.orders FOR DELETE TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can delete payments" ON public.payments;
CREATE POLICY "Service role can delete payments"
  ON public.payments FOR DELETE TO service_role USING (true);