import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { current_phone, name, new_phone } = await req.json();
    const currentClean = String(current_phone || "").replace(/\D/g, "");
    if (currentClean.length < 10) {
      return new Response(JSON.stringify({ error: "Telefone atual inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("phone", currentClean)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = {};
    if (name && String(name).trim()) updates.name = String(name).trim().slice(0, 100);

    if (new_phone) {
      const newClean = String(new_phone).replace(/\D/g, "");
      if (newClean.length < 10 || newClean.length > 11) {
        return new Response(JSON.stringify({ error: "Novo telefone inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (newClean !== currentClean) {
        const { data: existing } = await supabase
          .from("customer_profiles")
          .select("id")
          .eq("phone", newClean)
          .maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ error: "Já existe um cadastro com esse telefone" }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updates.phone = newClean;
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ profile }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updated, error } = await supabase
      .from("customer_profiles")
      .update(updates)
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ profile: updated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
