import { supabase } from "@/integrations/supabase/client";

export interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  last_order_type: string | null;
  last_payment_method: string | null;
  last_email: string | null;
  last_cpf: string | null;
}

export interface CustomerAddress {
  id: string;
  profile_id: string;
  label: string | null;
  cep: string;
  street: string;
  house_number: string;
  neighborhood: string | null;
  complement: string | null;
  city: string;
  is_default: boolean;
}

export interface CustomerOrder {
  id: string;
  daily_order_number: number | null;
  order_date: string | null;
  created_at: string;
  total_amount: number;
  items: Array<{ name: string; quantity: number; unitPrice?: number }>;
  order_type: string;
  payment_status: string;
  delivery_info: Record<string, unknown> | null;
}

export async function getOrCreateProfile(phone: string, name?: string) {
  const { data, error } = await supabase.functions.invoke("get-or-create-profile", {
    body: { phone, name },
  });
  if (error) return { data: null, error: error.message || "Erro" };
  if (data?.error) return { data: null, error: data.error, notFound: !!data.not_found };
  return { data: data as { profile: CustomerProfile; addresses: CustomerAddress[] }, error: null };
}

export async function updateProfile(current_phone: string, payload: { name?: string; new_phone?: string }) {
  const { data, error } = await supabase.functions.invoke("update-profile", {
    body: { current_phone, ...payload },
  });
  if (error) return { data: null, error: error.message || "Erro" };
  if (data?.error) return { data: null, error: data.error };
  return { data: data as { profile: CustomerProfile }, error: null };
}

export async function upsertAddress(phone: string, address: Partial<CustomerAddress>) {
  const { data, error } = await supabase.functions.invoke("upsert-address", {
    body: { phone, ...address },
  });
  if (error) return { data: null, error: error.message || "Erro" };
  if (data?.error) return { data: null, error: data.error };
  return { data: data as { address: CustomerAddress }, error: null };
}

export async function deleteAddress(phone: string, id: string) {
  const { data, error } = await supabase.functions.invoke("delete-address", {
    body: { phone, id },
  });
  if (error) return { data: null, error: error.message || "Erro" };
  if (data?.error) return { data: null, error: data.error };
  return { data, error: null };
}

export async function listCustomerOrders(phone: string) {
  const { data, error } = await supabase.functions.invoke("list-customer-orders", {
    body: { phone },
  });
  if (error) return { data: null, error: error.message || "Erro" };
  if (data?.error) return { data: null, error: data.error };
  return { data: data as { orders: CustomerOrder[] }, error: null };
}
