import { supabase } from "@/integrations/supabase/client";

interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  items: Array<{ id: string; name: string; quantity: number; unitPrice: number }>;
  order_type: "delivery" | "pickup";
  payment_method: string;
  delivery_info?: Record<string, unknown>;
  notes?: string;
}

interface CreateOrderResponse {
  order_id: string;
  total_amount: number;
  delivery_fee: number;
}

interface WhatsAppMessageResponse {
  establishmentMessage: string;
  deliveryGroupMessage: string | null;
  deliveryTelegramMessage: string | null;
  googleMapsLink: string | null;
}

export async function createOrder(
  payload: CreateOrderRequest
): Promise<{ data: CreateOrderResponse | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("create-order", {
      body: payload,
    });
    if (error) return { data: null, error: "Erro ao criar pedido." };
    if (data?.error) return { data: null, error: data.error };
    return { data, error: null };
  } catch {
    return { data: null, error: "Erro inesperado." };
  }
}

export async function buildWhatsAppMessage(
  orderId: string
): Promise<{ data: WhatsAppMessageResponse | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("build-whatsapp-message", {
      body: { order_id: orderId },
    });
    if (error) return { data: null, error: "Erro ao gerar mensagem." };
    if (data?.error) return { data: null, error: data.error };
    return { data, error: null };
  } catch {
    return { data: null, error: "Erro inesperado." };
  }
}
