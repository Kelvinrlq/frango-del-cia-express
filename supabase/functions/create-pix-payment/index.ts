import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fee table — must match client-side deliveryService.ts
const FEE_TABLE: [number, number][] = [
  [1.0, 7.0],
  [1.5, 8.5],
  [2.0, 9.5],
  [2.5, 11.0],
  [3.0, 12.0],
  [3.5, 13.5],
  [4.0, 15.0],
  [4.5, 16.5],
  [5.0, 18.0],
  [5.5, 19.5],
  [6.0, 21.0],
  [6.5, 22.5],
  [7.0, 24.0],
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
      notes,
    } = await req.json();

    // Reject if client tries to send deliveryFee
    if (delivery_info?.deliveryFee !== undefined) {
      return new Response(
        JSON.stringify({ error: "Campo deliveryFee não é aceito. A taxa é calculada pelo servidor." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone || !total_amount || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(customer_email)) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side price validation — never trust client-submitted total
    const FRANGO_PRICE = 50;
    const totalQuantity = items.reduce((sum: number, item: { quantity?: number }) => {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0 || qty !== Math.floor(qty)) {
        return NaN;
      }
      return sum + qty;
    }, 0);

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      return new Response(
        JSON.stringify({ error: "Itens inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate delivery fee server-side
    let serverDeliveryFee = 0;
    if (order_type === "delivery") {
      if (!delivery_info?.street || !delivery_info?.houseNumber || !delivery_info?.city) {
        return new Response(
          JSON.stringify({ error: "Endereço incompleto para entrega" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Call calculate-delivery edge function internally
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
        console.error("Delivery calculation failed:", calcData);
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
      console.log(`Server-calculated delivery fee: R$${fee} (distance: ${calcData.distanceKm}km)`);
    }

    const serverTotal = FRANGO_PRICE * totalQuantity + serverDeliveryFee;

    if (Math.abs(serverTotal - Number(total_amount)) > 0.01) {
      console.error(`Price mismatch: server=${serverTotal}, client=${total_amount}, deliveryFee=${serverDeliveryFee}`);
      return new Response(
        JSON.stringify({ error: "Valor do pedido inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validatedTotal = serverTotal;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store delivery_info with server-calculated fee
    const sanitizedDeliveryInfo = delivery_info ? {
      ...delivery_info,
      deliveryFee: serverDeliveryFee,
    } : null;

    // 1. Create order in DB
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name,
        customer_email,
        customer_phone: customer_phone.replace(/\D/g, ""),
        total_amount: validatedTotal,
        items,
        order_type: order_type || "delivery",
        delivery_info: sanitizedDeliveryInfo,
        notes: notes || null,
        payment_status: "pending",
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

    // 2. Create PIX payment via Mercado Pago
    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const mpPayload = {
      transaction_amount: validatedTotal,
      description: `Pedido Casa do Frango - ${items.length} item(s)`,
      payment_method_id: "pix",
      payer: {
        email: customer_email,
        first_name: customer_name.split(" ")[0],
        last_name: customer_name.split(" ").slice(1).join(" ") || customer_name,
        identification: {
          type: "CPF",
          number: "11144477735",
        },
      },
      date_of_expiration: expirationDate,
    };

    console.log("Creating MP payment:", JSON.stringify(mpPayload));

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
        "X-Idempotency-Key": order.id,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    console.log("FULL MP RESPONSE:", JSON.stringify(mpData, null, 2));

    if (!mpResponse.ok) {
      console.error("MP API error:", JSON.stringify(mpData));
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar pagamento PIX" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCodeString = mpData.point_of_interaction?.transaction_data?.qr_code;

    if (!qrCodeBase64 || !qrCodeString) {
      console.error("QR Code não encontrado na resposta do Mercado Pago:", JSON.stringify(mpData, null, 2));
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar QR Code PIX. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Save payment in DB
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        mercadopago_payment_id: String(mpData.id),
        amount: validatedTotal,
        status: "pending",
        method: "pix",
        pix_key: qrCodeString,
        qr_code: qrCodeString,
        qr_code_base64: qrCodeBase64,
        payment_details: mpData,
        expires_at: expirationDate,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        payment_id: payment?.id,
        mercadopago_payment_id: mpData.id,
        qr_code: qrCodeString,
        qr_code_base64: qrCodeBase64,
        pix_key: qrCodeString,
        amount: validatedTotal,
        delivery_fee: serverDeliveryFee,
        expires_at: expirationDate,
        status: "pending",
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
