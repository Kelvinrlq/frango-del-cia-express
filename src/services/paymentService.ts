import { supabase } from "@/integrations/supabase/client";
import type {
  CreatePixPaymentRequest,
  CreatePixPaymentResponse,
  CheckPaymentStatusResponse,
} from "@/types/payment.types";

export async function createPixPayment(
  payload: CreatePixPaymentRequest
): Promise<{ data: CreatePixPaymentResponse | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("create-pix-payment", {
      body: payload,
    });

    if (error) {
      console.error("createPixPayment error:", error);
      return { data: null, error: "Erro ao criar pagamento PIX. Tente novamente." };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("createPixPayment unexpected error:", err);
    return { data: null, error: "Erro inesperado. Tente novamente." };
  }
}

export async function checkPaymentStatus(
  mercadopagoPaymentId: number | string
): Promise<{ data: CheckPaymentStatusResponse | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("check-payment-status", {
      body: { mercadopago_payment_id: String(mercadopagoPaymentId) },
    });

    if (error) {
      console.error("checkPaymentStatus error:", error);
      return { data: null, error: "Erro ao verificar pagamento." };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("checkPaymentStatus unexpected error:", err);
    return { data: null, error: "Erro inesperado." };
  }
}
