import { supabase } from "@/integrations/supabase/client";

export async function sendWhatsAppViaEvolution(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone: phoneNumber, message },
    });

    if (error) {
      throw new Error(error.message || "Erro ao chamar send-whatsapp");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Falha no envio do WhatsApp");
    }

    return { success: true };
  } catch (error) {
    console.error("Erro Evolution API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
