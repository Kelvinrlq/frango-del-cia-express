import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "frango21";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const providedPwd = req.headers.get("x-admin-password");
    if (!providedPwd || providedPwd !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const isOpen = body?.is_open;
    if (typeof isOpen !== "boolean") {
      return new Response(JSON.stringify({ error: "is_open deve ser booleano" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const closedMessage =
      typeof body?.closed_message === "string"
        ? body.closed_message.trim().slice(0, 200)
        : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await supabase
      .from("store_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    let result;
    if (existing?.id) {
      result = await supabase
        .from("store_settings")
        .update({ is_open: isOpen, closed_message: closedMessage })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("store_settings")
        .insert({ is_open: isOpen, closed_message: closedMessage })
        .select()
        .single();
    }

    if (result.error) {
      console.error("set-store-status error:", JSON.stringify(result.error));
      return new Response(JSON.stringify({ error: "Erro ao salvar status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ settings: result.data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("set-store-status unexpected:", e);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
