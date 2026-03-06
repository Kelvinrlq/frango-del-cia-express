import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyWebhookSignature(
  req: Request,
  body: Record<string, unknown>
): Promise<boolean> {
  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature verification");
    return true; // Allow through if secret not configured yet
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.error("Missing x-signature or x-request-id headers");
    return false;
  }

  // Parse ts and v1 from x-signature: "ts=...,v1=..."
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, ...vals] = part.trim().split("=");
    parts[key] = vals.join("=");
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) {
    console.error("Invalid x-signature format");
    return false;
  }

  const dataId = body.data?.id ? String((body.data as Record<string, unknown>).id) : "";

  // Build the manifest string per MP docs
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const computed = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Verify signature
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error("Invalid webhook signature — rejecting request");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
