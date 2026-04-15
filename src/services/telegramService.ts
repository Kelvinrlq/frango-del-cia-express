import { supabase } from "@/integrations/supabase/client";

export async function sendTelegramMessage(
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-telegram", {
      body: { chat_id: chatId, message },
    });

    if (error) {
      throw new Error(error.message || "Erro ao chamar send-telegram");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Falha no envio do Telegram");
    }

    return { success: true };
  } catch (error) {
    console.error("Erro Telegram:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
