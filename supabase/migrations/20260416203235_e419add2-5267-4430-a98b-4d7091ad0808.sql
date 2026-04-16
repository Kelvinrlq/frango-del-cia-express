-- Remove políticas de INSERT permissivas que permitiam fraude
DROP POLICY IF EXISTS "Allow insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow insert payments" ON public.payments;

-- Pedidos e pagamentos só podem ser criados via Edge Functions (service_role)
-- O service_role já bypassa RLS, então nenhuma política adicional é necessária.