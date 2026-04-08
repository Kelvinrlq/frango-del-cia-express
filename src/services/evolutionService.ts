// src/services/evolutionService.ts
const EVOLUTION_API_URL = "https://frango-evolution-api.onrender.com";
const INSTANCE_NAME = "frango-delivery";

export async function sendWhatsAppViaEvolution(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Remove caracteres especiais do telefone
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao enviar: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Erro Evolution API:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}