import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, name } = await req.json();
    const phoneClean = String(phone || "").replace(/\D/g, "");
    if (phoneClean.length < 10 || phoneClean.length > 11) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let { data: profile } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("phone", phoneClean)
      .maybeSingle();

    if (!profile) {
      const cleanName = String(name || "").trim();
      if (!cleanName) {
        return new Response(JSON.stringify({ error: "Nome é obrigatório para novo cadastro", not_found: true }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: created, error: insErr } = await supabase
        .from("customer_profiles")
        .insert({ phone: phoneClean, name: cleanName.slice(0, 100) })
        .select()
        .single();
      if (insErr) {
        console.error("insert profile error", insErr);
        return new Response(JSON.stringify({ error: "Erro ao criar perfil" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      profile = created;
    }

    const { data: addresses } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("profile_id", profile!.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    return new Response(JSON.stringify({ profile, addresses: addresses || [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
