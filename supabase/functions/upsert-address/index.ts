import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const phoneClean = String(body.phone || "").replace(/\D/g, "");
    if (phoneClean.length < 10) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id, label, cep, street, house_number, neighborhood, complement, city, is_default } = body;
    if (!cep || !street || !house_number || !city) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios do endereço faltando" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("phone", phoneClean)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      profile_id: profile.id,
      label: label ? String(label).slice(0, 50) : null,
      cep: String(cep).slice(0, 20),
      street: String(street).slice(0, 200),
      house_number: String(house_number).slice(0, 20),
      neighborhood: neighborhood ? String(neighborhood).slice(0, 100) : null,
      complement: complement ? String(complement).slice(0, 100) : null,
      city: String(city).slice(0, 100),
      is_default: !!is_default,
    };

    let result;
    if (id) {
      const { data, error } = await supabase
        .from("customer_addresses")
        .update(payload)
        .eq("id", id)
        .eq("profile_id", profile.id)
        .select()
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar endereço" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      result = data;
    } else {
      const { count } = await supabase
        .from("customer_addresses")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id);
      if ((count ?? 0) === 0) payload.is_default = true;

      const { data, error } = await supabase
        .from("customer_addresses")
        .insert(payload)
        .select()
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: "Erro ao criar endereço" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      result = data;
    }

    if (payload.is_default) {
      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("profile_id", profile.id)
        .neq("id", result.id);
    }

    return new Response(JSON.stringify({ address: result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
