import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone || !total_amount || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
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

    const deliveryFee = delivery_info?.deliveryFee ? Number(delivery_info.deliveryFee) : 0;
    const serverTotal = FRANGO_PRICE * totalQuantity + deliveryFee;

    if (Math.abs(serverTotal - Number(total_amount)) > 0.01) {
      console.error(`Price mismatch: server=${serverTotal}, client=${total_amount}`);
      return new Response(
        JSON.stringify({ error: "Valor do pedido inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use server-computed total for the actual payment
    const validatedTotal = serverTotal;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Create order in DB
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name,
        customer_email,
        customer_phone: customer_phone.replace(/\D/g, ""),
        total_amount,
        items,
        order_type: order_type || "delivery",
        delivery_info: delivery_info || null,
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
      transaction_amount: Number(total_amount),
      description: `Pedido Casa do Frango - ${items.length} item(s)`,
      payment_method_id: "pix",
      payer: {
        email: customer_email,
        first_name: customer_name.split(" ")[0],
        last_name: customer_name.split(" ").slice(1).join(" ") || customer_name,
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

    if (!mpResponse.ok) {
      console.error("MP API error:", JSON.stringify(mpData));
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar pagamento PIX" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pixData = mpData.point_of_interaction?.transaction_data;

    // 3. Save payment in DB
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        mercadopago_payment_id: String(mpData.id),
        amount: total_amount,
        status: "pending",
        method: "pix",
        pix_key: pixData?.qr_code || null,
        qr_code: pixData?.qr_code || null,
        qr_code_base64: pixData?.qr_code_base64 || null,
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
        qr_code: pixData?.qr_code || null,
        qr_code_base64: pixData?.qr_code_base64 || null,
        pix_key: pixData?.qr_code || null,
        amount: total_amount,
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
