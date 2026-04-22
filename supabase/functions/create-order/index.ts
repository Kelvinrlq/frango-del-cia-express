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

    // Validate required fields
if (!customer_name || !customer_phone || !total_amount || !items || !Array.isArray(items) || items.length === 0) {      return new Response(
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
    const FRANGO_PRICE = 1;
    const DEBITO_ACRESCIMO = 1;
    const CREDITO_ACRESCIMO = 2.5;

    const totalQuantity = items.reduce((sum: number, item: { quantity?: number }) => {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0 || qty !== Math.floor(qty)) return NaN;
      return sum + qty;
    }, 0);

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

        // Calculate delivery fee server-side (FIXED: R$ 10 for Corumbá)
    let serverDeliveryFee = 0;
    if (order_type === "delivery") {
      if (!delivery_info?.street || !delivery_info?.houseNumber || !delivery_info?.city) {
        return new Response(
          JSON.stringify({ error: "Endereço incompleto para entrega" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Taxa fixa para Corumbá: R$ 10,00
      if (delivery_info.city.toLowerCase() === "corumbá" || delivery_info.city.toLowerCase() === "corumba") {
        serverDeliveryFee = 10;
      } else {
        return new Response(
          JSON.stringify({ error: "Entrega disponível apenas em Corumbá" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    const serverTotal = unitPrice * totalQuantity + serverDeliveryFee;

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

    // VERSÃO CORRIGIDA: Convertendo items e delivery_info para JSON string
      const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name,
        customer_email,
        customer_phone: customer_phone.replace(/\D/g, ""),
        total_amount: serverTotal,
        items, // ✅ SEM JSON.stringify
        order_type: order_type || "delivery",
        delivery_info: sanitizedDeliveryInfo || null, // ✅ SEM JSON.stringify
        notes: notes || null,
        payment_status: paymentStatus,
      })
      .select()
      .single();

    // MELHOR LOGGING DO ERRO
    if (orderError) {
      console.error("Order insert error:", JSON.stringify(orderError, null, 2));
      return new Response(
        JSON.stringify({ error: "Erro ao criar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
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