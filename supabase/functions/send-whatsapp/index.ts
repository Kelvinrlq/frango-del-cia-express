const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSTANCE_NAME = "frango-delivery";

// No explicit timeout — let the Edge Function's own wall-clock limit handle it

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados");
    }

    // Se for grupo (@g.us), usar o ID direto; senão, limpar para apenas dígitos
    const isGroup = phone.includes("@g.us");
    const destination = isGroup ? phone : phone.replace(/\D/g, "");

    console.log(`Enviando WhatsApp para ${destination} (grupo: ${isGroup})...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: destination,
          text: message,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log(`Evolution API response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`Evolution API erro: ${response.status} - ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro send-whatsapp:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
