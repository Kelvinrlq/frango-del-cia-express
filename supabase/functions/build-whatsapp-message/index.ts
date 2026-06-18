import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "📲 PIX",
  dinheiro: "💵 Dinheiro",
  debito: "💳 Débito",
  credito: "💳 Crédito",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = order.items as Array<{ name: string; quantity: number; unitPrice: number }>;
    const deliveryInfo = order.delivery_info as {
      street?: string;
      houseNumber?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      cep?: string;
      deliveryFee?: number;
      needs_change?: boolean;
      change_for?: number | null;
    } | null;

    const itemLines = items
      .map((i) => `  • ${i.quantity}x ${i.name} — ${formatCurrency(i.unitPrice * i.quantity)}`)
      .join("\n");

    // Map payment_status -> payment method label
    // Suporta status legados (cash/debit/credit) e novos (dinheiro/debito/credito)
    const PAYMENT_METHOD_MAP: Record<string, string> = {
      pending_dinheiro: "dinheiro",
      pending_debito: "debito",
      pending_credito: "credito",
      pending_cash: "dinheiro",
      pending_debit: "debito",
      pending_credit: "credito",
    };
    const paymentMethod = PAYMENT_METHOD_MAP[order.payment_status] ?? "pix";

    // Build establishment message — use daily order number (resets every day)
    const displayNumber = order.daily_order_number ?? order.order_number;
    const orderNumberLabel = displayNumber ? `#${displayNumber}` : "";
    let msg = `🍗 *NOVO PEDIDO ${orderNumberLabel} — Casa do Frango Assado da 21*\n\n`;
    msg += `📋 *Itens:*\n${itemLines}\n\n`;

    let googleMapsLink: string | null = null;

    if (order.order_type === "pickup") {
      msg += `🏪 *Tipo:* RETIRADA\n`;
      msg += `👤 *Nome:* ${order.customer_name}\n`;
      if (order.notes) msg += `⏰ *Horário:* ${order.notes.replace("Retirada às ", "")}\n`;
    } else {
      msg += `🚚 *Tipo:* ENTREGA\n`;
      msg += `👤 *Nome:* ${order.customer_name}\n`;
      if (deliveryInfo) {
        const addr = `${deliveryInfo.street}, ${deliveryInfo.houseNumber}${deliveryInfo.complement ? ` (${deliveryInfo.complement})` : ""}`;
        msg += `📍 *Endereço:* ${addr}\n`;
        msg += `🏘️ *Bairro:* ${deliveryInfo.neighborhood} — ${deliveryInfo.city || "Corumbá"}, ${deliveryInfo.state || "MS"}\n`;
        if (deliveryInfo.cep) msg += `📮 *CEP:* ${deliveryInfo.cep}\n`;
        googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deliveryInfo.street}, ${deliveryInfo.houseNumber}, ${deliveryInfo.neighborhood}, Corumbá, MS`)}`;
        msg += `🗺️ *Mapa:* ${googleMapsLink}\n`;
        if (deliveryInfo.deliveryFee) {
          msg += `🛵 *Taxa de entrega:* ${formatCurrency(deliveryInfo.deliveryFee)}\n`;
        }
      }
    }

    msg += `\n💳 *Pagamento:* ${PAYMENT_LABELS[paymentMethod] || paymentMethod}\n`;
    msg += `💰 *Total: ${formatCurrency(order.total_amount)}*\n`;

    if (paymentMethod === "dinheiro") {
      if (deliveryInfo?.needs_change && typeof deliveryInfo?.change_for === "number") {
        const trocoLevar = deliveryInfo.change_for - Number(order.total_amount);
        msg += `💵 *Troco para:* ${formatCurrency(deliveryInfo.change_for)} (levar ${formatCurrency(trocoLevar)} de troco)\n`;
      } else {
        msg += `💵 *Troco:* Não precisa\n`;
      }
    }

    if (paymentMethod === "pix") {
      msg += `\n✅ *Pagamento PIX já confirmado!*`;
    }

    // Build delivery group message for WhatsApp (kept for compatibility)
    let deliveryGroupMessage: string | null = null;
    // Build delivery group message for Telegram (HTML format)
    let deliveryTelegramMessage: string | null = null;
    if (order.order_type === "delivery" && deliveryInfo) {
      // WhatsApp format
      let gmsg = `📦 *Novo Pedido de Entrega:*\n\n`;
      gmsg += `📦 *Cliente:* ${order.customer_name}\n`;
      gmsg += `📞 *Telefone:* ${order.customer_phone}\n`;
      gmsg += `📍 *Endereço:* ${deliveryInfo.street}, ${deliveryInfo.houseNumber}, ${deliveryInfo.neighborhood}\n`;
      gmsg += `🏘️ *Complemento:* ${deliveryInfo.complement || "-"}\n`;
      if (googleMapsLink) gmsg += `🗺️ *Google Maps:* ${googleMapsLink}\n`;
      gmsg += `💰 *Total:* ${formatCurrency(order.total_amount)}`;
      deliveryGroupMessage = gmsg;

      // Telegram HTML format
      const orderNum = displayNumber ? `#${displayNumber}` : "";
      let tmsg = `📦 <b>PEDIDO ${orderNum} — Novo Pedido de Entrega</b>\n\n`;
      tmsg += `👤 <b>Cliente:</b> ${order.customer_name}\n`;
      tmsg += `📞 <b>Telefone:</b> ${order.customer_phone}\n`;
      tmsg += `📍 <b>Endereço:</b> ${deliveryInfo.street}, ${deliveryInfo.houseNumber}, ${deliveryInfo.neighborhood}\n`;
      tmsg += `🏘️ <b>Complemento:</b> ${deliveryInfo.complement || "-"}\n`;
      if (googleMapsLink) tmsg += `🗺️ <a href="${googleMapsLink}">📍 Ver no Google Maps</a>\n`;
      tmsg += `\n💰 <b>Total:</b> ${formatCurrency(order.total_amount)}`;
      tmsg += `\n💳 <b>Pagamento:</b> ${PAYMENT_LABELS[paymentMethod] || paymentMethod}`;
      if (paymentMethod === "dinheiro") {
        if (deliveryInfo?.needs_change && typeof deliveryInfo?.change_for === "number") {
          const trocoLevar = deliveryInfo.change_for - Number(order.total_amount);
          tmsg += `\n💵 <b>Troco para:</b> ${formatCurrency(deliveryInfo.change_for)} (levar ${formatCurrency(trocoLevar)})`;
        } else {
          tmsg += `\n💵 <b>Troco:</b> Não precisa`;
        }
      }
      deliveryTelegramMessage = tmsg;
    }

    return new Response(
      JSON.stringify({
        establishmentMessage: msg,
        deliveryGroupMessage,
        deliveryTelegramMessage,
        googleMapsLink,
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
