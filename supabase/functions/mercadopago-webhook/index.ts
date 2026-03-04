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
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends action: "payment.created", "payment.updated"
    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpPaymentId = body.data?.id;
    if (!mpPaymentId) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
      { headers: { Authorization: `Bearer ${mpToken}` } }
    );

    if (!mpResponse.ok) {
      console.error("Failed to fetch MP payment:", mpResponse.status);
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 200, // Always return 200 to MP
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();
    const mpStatus = mpData.status;

    let ourStatus = "pending";
    let orderStatus = "pending";
    if (mpStatus === "approved") {
      ourStatus = "approved";
      orderStatus = "paid";
    } else if (mpStatus === "rejected") {
      ourStatus = "rejected";
      orderStatus = "failed";
    } else if (mpStatus === "cancelled") {
      ourStatus = "cancelled";
      orderStatus = "cancelled";
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find and update payment
    const { data: payment } = await supabase
      .from("payments")
      .select("id, order_id, status")
      .eq("mercadopago_payment_id", String(mpPaymentId))
      .single();

    if (payment) {
      await supabase
        .from("payments")
        .update({ status: ourStatus, payment_details: mpData })
        .eq("id", payment.id);

      await supabase
        .from("orders")
        .update({ payment_status: orderStatus })
        .eq("id", payment.order_id);

      console.log(`Payment ${mpPaymentId} updated to ${ourStatus}`);
    } else {
      console.log(`Payment ${mpPaymentId} not found in DB`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, // Always return 200 to MP
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
