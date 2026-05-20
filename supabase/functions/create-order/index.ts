import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fixed delivery fee for Corumbá-MS
const FIXED_DELIVERY_FEE = 10.0;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      total_amount,
      items,
      order_type,
      delivery_info,
      payment_method,
      notes,
    } = await req.json();

    console.log("🔍 Request body recebido:", { 
      customer_name, 
      customer_phone, 
      total_amount, 
      items: items?.length,
      items_full: JSON.stringify(items),
      order_type,
      payment_method 
    });
    
    // Validate required fields
    if (!customer_name || !customer_phone || !total_amount || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (customer_email && !EMAIL_REGEX.test(customer_email)) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reject client-submitted deliveryFee
    if (delivery_info?.deliveryFee !== undefined) {
      return new Response(
        JSON.stringify({ error: "Campo deliveryFee não é aceito." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side price validation
    const FRANGO_PRICE = 50;
    const DEBITO_ACRESCIMO = 1;
    const CREDITO_ACRESCIMO = 2.5;

    const totalQuantity = items.reduce((sum: number, item: { quantity?: number }) => {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0 || qty !== Math.floor(qty)) return NaN;
      return sum + qty;
    }, 0);

    console.log("📊 Cálculo de preço - ANTES validação:", {
      totalQuantity,
      FRANGO_PRICE,
      payment_method,
      order_type,
      serverDeliveryFee_esperada: order_type === "delivery" ? 10 : 0,
      total_amount_recebido: total_amount
    });

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      return new Response(
        JSON.stringify({ error: "Itens inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate unit price based on payment method
    let unitPrice = FRANGO_PRICE;
    if (payment_method === "debito") unitPrice += DEBITO_ACRESCIMO;
    if (payment_method === "credito") unitPrice += CREDITO_ACRESCIMO;

    console.log("💰 Unit price calculado:", {
      unitPrice,
      payment_method,
      totalQuantity
    });

    // Calculate delivery fee server-side (Corumbá: R$10, Ladário: R$14)
    let serverDeliveryFee = 0;
    if (order_type === "delivery") {
      if (!delivery_info?.street || !delivery_info?.houseNumber || !delivery_info?.city) {
        return new Response(
          JSON.stringify({ error: "Endereço incompleto para entrega" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cityNorm = delivery_info.city.toLowerCase().trim();
      if (cityNorm === "corumbá" || cityNorm === "corumba") {
        serverDeliveryFee = 10;
      } else if (cityNorm === "ladário" || cityNorm === "ladario") {
        serverDeliveryFee = 14;
      } else {
        return new Response(
          JSON.stringify({ error: "Entrega disponível apenas em Corumbá e Ladário" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const serverTotal = unitPrice * totalQuantity + serverDeliveryFee;

    console.log("🔢 VALORES FINAIS COMPARAÇÃO:", {
      serverTotal,
      total_amount,
      diferenca: Math.abs(serverTotal - Number(total_amount)),
      unitPrice,
      totalQuantity,
      serverDeliveryFee,
      payment_method
    });

    if (Math.abs(serverTotal - Number(total_amount)) > 0.01) {
      console.error(`Price mismatch: server=${serverTotal}, client=${total_amount}`);
      return new Response(
        JSON.stringify({ error: "Valor do pedido inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sanitizedDeliveryInfo = delivery_info ? {
      ...delivery_info,
      deliveryFee: serverDeliveryFee,
    } : null;

    const paymentStatus = payment_method === "dinheiro" ? "pending_dinheiro"
      : payment_method === "debito" ? "pending_debito"
      : payment_method === "credito" ? "pending_credito"
      : "pending";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name,
        customer_email,
        customer_phone: customer_phone.replace(/\D/g, ""),
        total_amount: serverTotal,
        items,
        order_type: order_type || "delivery",
        delivery_info: sanitizedDeliveryInfo || null,
        notes: notes || null,
        payment_status: paymentStatus,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order insert error:", JSON.stringify(orderError, null, 2));
      return new Response(
        JSON.stringify({ error: "Erro ao criar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sync customer profile preferences (fire-and-forget style — errors logged but not blocking)
    try {
      const phoneClean = customer_phone.replace(/\D/g, "");
      const { data: prof } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("phone", phoneClean)
        .maybeSingle();
      if (prof) {
        await supabase.from("customer_profiles").update({
          last_order_type: order_type || "delivery",
          last_payment_method: payment_method,
        }).eq("id", prof.id);

        if (order_type === "delivery" && sanitizedDeliveryInfo) {
          const { data: existing } = await supabase
            .from("customer_addresses")
            .select("id")
            .eq("profile_id", prof.id)
            .eq("cep", sanitizedDeliveryInfo.cep)
            .eq("house_number", sanitizedDeliveryInfo.houseNumber)
            .maybeSingle();
          if (!existing) {
            const { count } = await supabase
              .from("customer_addresses")
              .select("id", { count: "exact", head: true })
              .eq("profile_id", prof.id);
            await supabase.from("customer_addresses").insert({
              profile_id: prof.id,
              cep: sanitizedDeliveryInfo.cep,
              street: sanitizedDeliveryInfo.street || "",
              house_number: sanitizedDeliveryInfo.houseNumber,
              neighborhood: sanitizedDeliveryInfo.neighborhood || null,
              complement: sanitizedDeliveryInfo.complement || null,
              city: sanitizedDeliveryInfo.city,
              is_default: (count ?? 0) === 0,
            });
          }
        }
      }
    } catch (e) {
      console.error("profile sync error:", e);
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        daily_order_number: order.daily_order_number ?? null,
        total_amount: serverTotal,
        delivery_fee: serverDeliveryFee,
      }),
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