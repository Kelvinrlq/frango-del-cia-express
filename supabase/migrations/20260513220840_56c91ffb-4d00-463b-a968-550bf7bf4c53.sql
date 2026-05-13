-- Customer profiles table
CREATE TABLE public.customer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  last_order_type TEXT,
  last_payment_method TEXT,
  last_email TEXT,
  last_cpf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access profiles"
  ON public.customer_profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer addresses table
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  label TEXT,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  neighborhood TEXT,
  complement TEXT,
  city TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_addresses_profile ON public.customer_addresses(profile_id);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access addresses"
  ON public.customer_addresses FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();