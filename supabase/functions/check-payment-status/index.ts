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
    const { mercadopago_payment_id } = await req.json();

    if (!mercadopago_payment_id) {
      return new Response(
        JSON.stringify({ error: "mercadopago_payment_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    // Query Mercado Pago API
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${mercadopago_payment_id}`,
      {
        headers: { Authorization: `Bearer ${mpToken}` },
      }
    );

    if (!mpResponse.ok) {
      const errData = await mpResponse.json();
      console.error("MP status check error:", JSON.stringify(errData));
      return new Response(
        JSON.stringify({ error: "Erro ao consultar pagamento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await mpResponse.json();
    const mpStatus = mpData.status; // pending, approved, rejected, cancelled, etc.

    // Map MP status to our status
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

    // Update DB if status changed
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: payment, error: paymentFetchError } = await supabase
      .from("payments")
      .select("id, order_id, status")
      .eq("mercadopago_payment_id", String(mercadopago_payment_id))
      .single();

    if (paymentFetchError) {
      console.error("Error fetching payment:", JSON.stringify(paymentFetchError));
    }

    if (payment && payment.status !== ourStatus) {
      if (ourStatus === "approved") {
        const { error: rpcError } = await supabase.rpc("mark_payment_approved", {
          p_payment_id: payment.id,
          p_mp_data: mpData,
        });
        if (rpcError) {
          console.error("mark_payment_approved error:", JSON.stringify(rpcError));
        } else {
          console.log(`Payment ${payment.id} marked as approved (order ${payment.order_id} -> paid)`);
        }
      } else {
        const { error: rpcError } = await supabase.rpc("sync_payment_status", {
          p_payment_id: payment.id,
          p_payment_status: ourStatus,
          p_order_status: orderStatus,
          p_mp_data: mpData,
        });
        if (rpcError) {
          console.error("sync_payment_status error:", JSON.stringify(rpcError));
        } else {
          console.log(`Payment ${payment.id} synced -> ${ourStatus} / order -> ${orderStatus}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: ourStatus,
        mercadopago_status: mpStatus,
        mercadopago_payment_id,
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
