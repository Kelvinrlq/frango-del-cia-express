import { useState, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import {
  PaymentMethod,
  DeliveryInfo,
  calcTotal,
  formatCurrency,
} from "@/types/order";
import { getDeliveryDistance, calculateDeliveryFee } from "@/services/deliveryService";
import { createPixPayment } from "@/services/paymentService";
import { supabase } from "@/integrations/supabase/client";
import PixPaymentDisplay from "@/components/PixPaymentDisplay";
import PaymentStatus from "@/components/PaymentStatus";
import { X, MapPin, Clock, User, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import type { CreatePixPaymentResponse } from "@/types/payment.types";

const ESTABLISHMENT_PHONE = "556793277165";

interface OrderModalProps {
  onClose: () => void;
}

type Step = "type" | "form" | "confirm" | "pix" | "sent";
type OrderType = "delivery" | "pickup";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "📲 PIX",
  dinheiro: "💵 Dinheiro",
  debito: "💳 Débito (+R$1,00)",
  credito: "💳 Crédito (+R$2,50)",
};

async function fetchCep(cep: string) {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const { data, error } = await supabase.functions.invoke("lookup-cep", {
      body: { cep: clean },
    });
    if (error || !data || data.error) return null;
    return data;
  } catch {
    return null;
  }
}

export default function OrderModal({ onClose }: OrderModalProps) {
  const { items, clearCart } = useCart();
  const [step, setStep] = useState<Step>("type");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("pix");

  // Delivery state
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<Partial<DeliveryInfo>>({});
  const [houseNumber, setHouseNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [outOfRange, setOutOfRange] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Pickup state
  const [pickupName, setPickupName] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [deliveryName, setDeliveryName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");

  const [cepError, setCepError] = useState("");

  // PIX payment state
  const [pixData, setPixData] = useState<CreatePixPaymentResponse | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const deliveryFee = orderType === "delivery" ? (deliveryInfo.deliveryFee ?? 0) : 0;
  const total = calcTotal(totalQty, payment, deliveryFee);

  const handleCepChange = async (val: string) => {
    const formatted = val
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
    setCep(formatted);
    setCepError("");
    setOutOfRange(false);
    setDistanceKm(null);

    if (formatted.replace(/\D/g, "").length === 8) {
      setCepLoading(true);
      const data = await fetchCep(formatted);
      setCepLoading(false);
      if (data) {
        setDeliveryInfo({
          cep: formatted,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf || "MS",
          deliveryFee: 0,
        });
      } else {
        setDeliveryInfo({});
        setCepError("CEP não encontrado. Verifique e tente novamente.");
      }
    }
  };

  const calculateFee = useCallback(async () => {
    if (!deliveryInfo.street || !houseNumber.trim() || !deliveryInfo.city) return;
    setDistanceLoading(true);
    setOutOfRange(false);
    setCepError("");
    const result = await getDeliveryDistance(
      deliveryInfo.street,
      houseNumber.trim(),
      deliveryInfo.neighborhood || "",
      deliveryInfo.city,
      deliveryInfo.state || "MS",
      cep.replace(/\D/g, "")
    );
    setDistanceLoading(false);
    if (result.error) {
      setCepError(result.error);
      setDeliveryInfo((prev) => ({ ...prev, deliveryFee: 0 }));
      return;
    }
    setDistanceKm(result.roundedKm);
    if (result.fee === null) {
      setOutOfRange(true);
      setDeliveryInfo((prev) => ({ ...prev, deliveryFee: 0 }));
    } else {
      setOutOfRange(false);
      setDeliveryInfo((prev) => ({ ...prev, deliveryFee: result.fee! }));
    }
  }, [deliveryInfo.street, deliveryInfo.neighborhood, deliveryInfo.city, deliveryInfo.state, houseNumber, cep]);

  const handleHouseNumberChange = (val: string) => {
    setHouseNumber(val);
    setOutOfRange(false);
    setDistanceKm(null);
    setDeliveryInfo((prev) => ({ ...prev, deliveryFee: 0 }));
  };

  const handleCpfChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    const formatted = digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setCustomerCpf(formatted);
  };

  const isCpfValid = customerCpf.replace(/\D/g, "").length === 11;

  const canProceedForm = () => {
    if (orderType === "pickup") {
      return pickupName.trim() && pickupTime.trim() && isCpfValid;
    }
    return (
      deliveryName.trim() &&
      deliveryInfo.street &&
      houseNumber.trim() &&
      cep.replace(/\D/g, "").length === 8 &&
      !outOfRange &&
      (deliveryInfo.deliveryFee ?? 0) > 0 &&
      !distanceLoading &&
      isCpfValid
    );
  };

  const buildWhatsAppMessage = () => {
    const itemLines = items
      .map((i) => `  • ${i.quantity}x ${i.name} — ${formatCurrency(i.unitPrice * i.quantity)}`)
      .join("\n");

    let msg = `🍗 *NOVO PEDIDO — Casa do Frango Assado da 21*\n\n`;
    msg += `📋 *Itens:*\n${itemLines}\n\n`;

    if (orderType === "pickup") {
      msg += `🏪 *Tipo:* RETIRADA\n`;
      msg += `👤 *Nome:* ${pickupName}\n`;
      msg += `⏰ *Horário de retirada:* ${pickupTime}\n`;
    } else {
      msg += `🚚 *Tipo:* ENTREGA\n`;
      msg += `👤 *Nome:* ${deliveryName}\n`;
      msg += `📍 *Endereço:* ${deliveryInfo.street}, ${houseNumber}${complement ? ` (${complement})` : ""}\n`;
      msg += `🏘️ *Bairro:* ${deliveryInfo.neighborhood} — ${deliveryInfo.city}\n`;
      msg += `📮 *CEP:* ${cep}\n`;
      msg += `🛵 *Taxa de entrega:* ${formatCurrency(deliveryFee)}\n`;
    }

    msg += `\n💳 *Pagamento:* ${PAYMENT_LABELS[payment]}\n`;
    msg += `💰 *Total: ${formatCurrency(total)}*\n`;

    if (payment === "pix") {
      msg += `\n✅ *Pagamento PIX já confirmado!*`;
    }

    return encodeURIComponent(msg);
  };

  const sendWhatsApp = () => {
    const msg = buildWhatsAppMessage();
    window.open(`https://wa.me/${ESTABLISHMENT_PHONE}?text=${msg}`, "_blank");
    if (orderType === "delivery") {
      setTimeout(() => {
        window.open(`https://wa.me/120363423717180111?text=${msg}`, "_blank");
      }, 800);
    }
  };

  const handleSend = async () => {
    if (payment === "pix") {
      // Create PIX payment
      setPixLoading(true);
      setPixError(null);

      const customerName = orderType === "pickup" ? pickupName : deliveryName;
      const { data, error } = await createPixPayment({
        customer_name: customerName,
        customer_email: `${customerName.toLowerCase().replace(/\s+/g, ".")}@cliente.com`,
        customer_phone: "00000000000",
        customer_cpf: customerCpf.replace(/\D/g, ""),
        total_amount: total,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        order_type: orderType,
        delivery_info: orderType === "delivery" ? {
          street: deliveryInfo.street,
          houseNumber,
          complement,
          neighborhood: deliveryInfo.neighborhood,
          city: deliveryInfo.city,
          state: deliveryInfo.state || "MS",
          cep,
        } : undefined,
        notes: orderType === "pickup" ? `Retirada às ${pickupTime}` : undefined,
      });

      setPixLoading(false);

      if (error || !data) {
        setPixError(error || "Erro ao gerar pagamento PIX");
        return;
      }

      setPixData(data);
      setStep("pix");
    } else {
      // Non-PIX: send WhatsApp directly
      sendWhatsApp();
      setStep("sent");
      clearCart();
    }
  };

  const handlePixApproved = () => {
    sendWhatsApp();
    setStep("sent");
    clearCart();
  };

  const handlePixExpired = () => {
    setPixError("O tempo para pagamento expirou. Tente novamente.");
    setStep("confirm");
    setPixData(null);
  };

  const availablePayments: PaymentMethod[] =
    orderType === "pickup"
      ? ["pix"]
      : ["pix", "dinheiro", "debito", "credito"];

  const stepTitle = () => {
    if (step === "type") return "Como deseja receber?";
    if (step === "form") return orderType === "delivery" ? "Endereço de entrega" : "Dados para retirada";
    if (step === "confirm") return "Resumo do pedido";
    if (step === "pix") return "Pagamento PIX";
    return "";
  };

  return (
    <>
      <div className="fixed inset-0 bg-secondary/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-card rounded-t-3xl md:rounded-2xl w-full md:max-w-lg shadow-2xl flex flex-col max-h-[92vh] animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="gradient-hero p-5 flex items-center justify-between shrink-0">
            <div>
              <p className="text-secondary/70 text-sm font-semibold uppercase tracking-wide">
                {stepTitle()}
              </p>
              <h2 className="font-display text-2xl text-secondary">Finalizar Pedido</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center hover:bg-secondary/20 transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* STEP 1 — Order Type */}
            {step === "type" && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-muted-foreground font-semibold text-sm">
                  Você tem {totalQty} frango{totalQty > 1 ? "s" : ""} no carrinho.
                </p>
                {(["delivery", "pickup"] as OrderType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setOrderType(t); setPayment("pix"); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      orderType === t
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted hover:border-primary/40"
                    }`}
                  >
                    <span className="text-3xl">{t === "delivery" ? "🏍️" : "🏪"}</span>
                    <div>
                      <p className="font-display text-xl text-foreground">
                        {t === "delivery" ? "Entrega" : "Retirada"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t === "delivery"
                          ? "Receba em casa — taxa por distância"
                          : "Buscar no estabelecimento — pagar via PIX antes"}
                      </p>
                    </div>
                    <ChevronRight
                      className={`ml-auto w-5 h-5 transition-colors ${orderType === t ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}

                <button
                  onClick={() => setStep("form")}
                  className="w-full gradient-hero text-secondary font-display text-xl py-4 rounded-xl shadow-button hover:opacity-90 transition-opacity mt-2"
                >
                  Continuar →
                </button>
              </div>
            )}

            {/* STEP 2 — Form */}
            {step === "form" && (
              <div className="space-y-4 animate-fade-in">
                {orderType === "pickup" ? (
                  <>
                    <div className="bg-muted border border-primary/30 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground font-semibold">
                        Para retirada, o pagamento é <strong>somente via PIX</strong> antes de buscar o frango.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        Nome de quem vai buscar *
                      </label>
                      <input
                        type="text"
                        value={pickupName}
                        onChange={(e) => setPickupName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Horário de retirada *
                      </label>
                      <select
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selecione o horário</option>
                        <option value="08:00">08:00</option>
                        <option value="08:30">08:30</option>
                        <option value="09:00">09:00</option>
                        <option value="09:30">09:30</option>
                        <option value="10:00">10:00</option>
                        <option value="10:30">10:30</option>
                        <option value="11:00">11:00</option>
                        <option value="11:30">11:30</option>
                        <option value="12:00">12:00</option>
                        <option value="12:30">12:30</option>
                        <option value="13:00">13:00</option>
                        <option value="13:30">13:30</option>
                        <option value="14:00">14:00</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        Nome de quem vai receber *
                      </label>
                      <input
                        type="text"
                        value={deliveryName}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
                          setDeliveryName(val);
                        }}
                        placeholder="Ex: João Silva"
                        maxLength={100}
                        className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        CEP *
                      </label>
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {cepLoading && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
                      {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
                      {deliveryInfo.street && (
                        <div className="mt-2 bg-muted rounded-xl p-3 text-sm">
                          <p className="font-semibold text-foreground">{deliveryInfo.street}</p>
                          <p className="text-muted-foreground">{deliveryInfo.neighborhood} — {deliveryInfo.city}</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Número *</label>
                        <input
                          type="text"
                          value={houseNumber}
                          onChange={(e) => handleHouseNumberChange(e.target.value)}
                          placeholder="123"
                          className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Complemento</label>
                        <input
                          type="text"
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          placeholder="Apto, bloco..."
                          className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Calculate delivery fee button */}
                    {deliveryInfo.street && houseNumber.trim() && (
                      <button
                        onClick={calculateFee}
                        disabled={distanceLoading}
                        className="w-full py-3 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {distanceLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Calculando distância...
                          </>
                        ) : (
                          "📍 Calcular Taxa de Entrega"
                        )}
                      </button>
                    )}

                    {/* Fee result */}
                    {(deliveryInfo.deliveryFee ?? 0) > 0 && distanceKm !== null && (
                      <div className="bg-muted border border-primary/30 rounded-xl p-3 text-sm">
                        <p className="text-muted-foreground">Distância: {distanceKm} km</p>
                        <p className="text-primary font-bold text-lg mt-1">
                          🛵 Taxa de entrega: {formatCurrency(deliveryInfo.deliveryFee ?? 0)}
                        </p>
                      </div>
                    )}

                    {/* Out of range */}
                    {outOfRange && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm">
                        <p className="text-destructive font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Fora da área de cobertura
                        </p>
                        <p className="text-muted-foreground mt-1">
                          Distância fora da área de cobertura padrão, favor consultar valor no WhatsApp.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Payment */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Forma de pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availablePayments.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPayment(p)}
                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          payment === p
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {PAYMENT_LABELS[p]}
                      </button>
                    ))}
                  </div>
                  {orderType === "pickup" && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Retirada aceita apenas PIX como pagamento antecipado.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("type")}
                    className="flex-1 py-3 rounded-xl border-2 border-border text-foreground font-bold hover:bg-muted transition-colors"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={() => canProceedForm() && setStep("confirm")}
                    disabled={!canProceedForm()}
                    className="flex-1 gradient-hero text-secondary font-display text-xl py-3 rounded-xl shadow-button hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Revisar →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Confirm */}
            {step === "confirm" && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <h3 className="font-display text-lg text-foreground">📋 Seus itens</h3>
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm font-semibold">
                      <span>{item.quantity}x {item.name}</span>
                      <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <h3 className="font-display text-lg text-foreground">
                    {orderType === "delivery" ? "🚚 Entrega" : "🏪 Retirada"}
                  </h3>
                  {orderType === "pickup" ? (
                    <>
                      <p className="text-sm font-semibold">👤 {pickupName}</p>
                      <p className="text-sm font-semibold">⏰ {pickupTime}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">👤 {deliveryName}</p>
                      <p className="text-sm font-semibold">
                        📍 {deliveryInfo.street}, {houseNumber}{complement ? ` (${complement})` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">{deliveryInfo.neighborhood} — {deliveryInfo.city}</p>
                      <p className="text-sm font-semibold text-primary">
                        🛵 Taxa de entrega: {formatCurrency(deliveryFee)}
                      </p>
                    </>
                  )}
                  <p className="text-sm font-semibold">💳 {PAYMENT_LABELS[payment]}</p>
                </div>

                <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 flex justify-between items-center">
                  <span className="font-display text-xl text-foreground">Total</span>
                  <span className="font-display text-3xl text-primary">{formatCurrency(total)}</span>
                </div>

                {payment === "pix" && (
                  <div className="bg-muted border border-border rounded-xl p-3 text-sm font-semibold text-foreground">
                    📲 Ao confirmar, será gerado um QR Code PIX para pagamento imediato.
                  </div>
                )}

                {pixError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive font-bold">
                    ⚠️ {pixError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("form")}
                    className="flex-1 py-3 rounded-xl border-2 border-border text-foreground font-bold hover:bg-muted transition-colors"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={pixLoading}
                    className="flex-1 gradient-hero text-secondary font-display text-xl py-4 rounded-xl shadow-button hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {pixLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : (
                      "Enviar Pedido 🍗"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 — PIX Payment */}
            {step === "pix" && pixData && (
              <div className="space-y-4 animate-fade-in">
                <PixPaymentDisplay
                  qrCodeBase64={pixData.qr_code_base64}
                  pixKey={pixData.pix_key}
                  amount={pixData.amount}
                  expiresAt={pixData.expires_at}
                />

                <PaymentStatus
                  mercadopagoPaymentId={pixData.mercadopago_payment_id}
                  onApproved={handlePixApproved}
                  onExpired={handlePixExpired}
                  expiresAt={pixData.expires_at}
                />

                <button
                  onClick={() => { setStep("confirm"); setPixData(null); }}
                  className="w-full py-3 rounded-xl border-2 border-border text-foreground font-bold hover:bg-muted transition-colors"
                >
                  ← Cancelar e voltar
                </button>
              </div>
            )}

            {/* SENT */}
            {step === "sent" && (
              <div className="text-center py-8 space-y-4 animate-bounce-in">
                <div className="text-7xl">🎉</div>
                <h3 className="font-display text-3xl text-foreground">Pedido Enviado!</h3>
                <p className="text-muted-foreground font-semibold">
                  Seu pedido foi enviado pelo WhatsApp. Em breve entraremos em contato para confirmar!
                </p>
                {payment === "pix" && (
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-foreground font-semibold text-sm flex items-center justify-center gap-2">
                    ✅ Pagamento PIX confirmado com sucesso!
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="gradient-hero text-secondary font-display text-xl px-8 py-4 rounded-xl shadow-button hover:opacity-90 transition-opacity"
                >
                  Fazer novo pedido
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
