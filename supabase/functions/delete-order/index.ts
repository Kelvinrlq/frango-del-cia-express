import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Senha de admin: usa env var ADMIN_PASSWORD se configurada, senão fallback para a senha do painel
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "frango21";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const providedPwd = req.headers.get("x-admin-password");
    if (!providedPwd || providedPwd !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id } = await req.json();

    if (!order_id || typeof order_id !== "string") {
      return new Response(
        JSON.stringify({ error: "order_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Apaga pagamentos primeiro (não há ON DELETE CASCADE garantido)
    const { error: payErr } = await supabase
      .from("payments")
      .delete()
      .eq("order_id", order_id);

    if (payErr) {
      console.error("Error deleting payments:", JSON.stringify(payErr));
      return new Response(
        JSON.stringify({ error: "Erro ao excluir pagamentos do pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: orderErr } = await supabase
      .from("orders")
      .delete()
      .eq("id", order_id);

    if (orderErr) {
      console.error("Error deleting order:", JSON.stringify(orderErr));
      return new Response(
        JSON.stringify({ error: "Erro ao excluir pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Order ${order_id} deleted by admin`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
