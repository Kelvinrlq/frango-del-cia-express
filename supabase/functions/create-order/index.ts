import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEE_TABLE: [number, number][] = [
  [1.0, 7.0], [1.5, 8.5], [2.0, 9.5], [2.5, 11.0], [3.0, 12.0],
  [3.5, 13.5], [4.0, 15.0], [4.5, 16.5], [5.0, 18.0], [5.5, 19.5],
  [6.0, 21.0], [6.5, 22.5], [7.0, 24.0],
];

function calculateDeliveryFee(distanceKm: number): number | null {
  const roundedKm = Math.round(distanceKm * 2) / 2;
  for (const [maxKm, fee] of FEE_TABLE) {
    if (roundedKm <= maxKm) return fee;
  }
  return null;
}

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
    if (!customer_name || !customer_email || !customer_phone || !total_amount || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EMAIL_REGEX.test(customer_email)) {
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

    // Calculate delivery fee server-side
    let serverDeliveryFee = 0;
    if (order_type === "delivery") {
      if (!delivery_info?.street || !delivery_info?.houseNumber || !delivery_info?.city) {
        return new Response(
          JSON.stringify({ error: "Endereço incompleto para entrega" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const calcRes = await fetch(`${supabaseUrl}/functions/v1/calculate-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          street: delivery_info.street,
          number: delivery_info.houseNumber,
          neighborhood: delivery_info.neighborhood || "",
          city: delivery_info.city,
          state: delivery_info.state || "MS",
          zipCode: delivery_info.cep?.replace(/\D/g, "") || "",
        }),
      });

      const calcData = await calcRes.json();

      if (!calcRes.ok || calcData.error) {
        return new Response(
          JSON.stringify({ error: calcData.error || "Erro ao calcular taxa de entrega" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fee = calculateDeliveryFee(calcData.distanceKm);
      if (fee === null) {
        return new Response(
          JSON.stringify({ error: "Endereço fora da área de cobertura" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      serverDeliveryFee = fee;
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

    const paymentStatus = payment_method === "dinheiro" ? "pending_cash"
      : payment_method === "debito" ? "pending_debit"
      : payment_method === "credito" ? "pending_credit"
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
        delivery_info: sanitizedDeliveryInfo,
        notes: notes || null,
        payment_status: paymentStatus,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
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
