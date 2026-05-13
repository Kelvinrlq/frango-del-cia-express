
REVOKE EXECUTE ON FUNCTION public.mark_payment_approved(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_payment_status(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_payment_by_order(uuid) FROM PUBLIC, anon, authenticated;
