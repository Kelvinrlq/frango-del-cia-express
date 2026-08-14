import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useProfile } from "@/context/ProfileContext";
import {
  PaymentMethod,
  DeliveryInfo,
  calcTotal,
  formatCurrency,
} from "@/types/order";
import { createPixPayment } from "@/services/paymentService";
import { createOrder, buildWhatsAppMessage } from "@/services/orderService";
import { sendTelegramMessage } from "@/services/telegramService";
import { supabase } from "@/integrations/supabase/client";
import PixPaymentDisplay from "@/components/PixPaymentDisplay";
import PaymentStatus from "@/components/PaymentStatus";
import { X, MapPin, User, AlertCircle, Loader2, Trash2, Plus } from "lucide-react";
import type { CreatePixPaymentResponse } from "@/types/payment.types";


const ESTABLISHMENT_PHONE = "556793277165";
const ESTABLISHMENT_EMAIL = "kelvintrp538@gmail.com";
const TELEGRAM_DELIVERY_GROUP_ID = "-5292514760";

interface OrderModalProps {
  onClose: () => void;
}

type Step = "payment" | "form" | "confirm" | "pix" | "sent";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "📲 PIX",
  dinheiro: "💵 Dinheiro",
  debito: "💳 Débito (+R$1,00)",
  credito: "💳 Crédito (+R$2,50)",
};

const formatPhone = (digits: string) =>
  digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

const feeForCity = (city?: string): number => {
  const c = (city || "").toLowerCase().trim();
  if (c === "ladário" || c === "ladario") return 14;
  return 10; // Corumbá (default)
};

export default function OrderModal({ onClose }: OrderModalProps) {
  const { items, clearCart } = useCart();
  const { profile, addresses, deleteAddress } = useProfile();
  const [step, setStep] = useState<Step>("payment");
  const [payment, setPayment] = useState<PaymentMethod>(() => {
    const last = profile?.last_payment_method as PaymentMethod | undefined;
    return last && last !== "pix" ? last : "dinheiro";
  });


  // Saved address selection
  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">(
    defaultAddress ? defaultAddress.id : "new"
  );

  // Delivery state — initialized from default saved address, if any
  const [cep, setCep] = useState(defaultAddress?.cep || "");
  const [cepLoading, setCepLoading] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<Partial<DeliveryInfo>>(
    defaultAddress
      ? {
          cep: defaultAddress.cep,
          street: defaultAddress.street,
          neighborhood: defaultAddress.neighborhood || "",
          city: defaultAddress.city,
          state: "MS",
          deliveryFee: feeForCity(defaultAddress.city),
        }
      : {}
  );
  const [houseNumber, setHouseNumber] = useState(defaultAddress?.house_number || "");
  const [complement, setComplement] = useState(defaultAddress?.complement || "");
  const [outOfRange, setOutOfRange] = useState(false);

  const [deliveryName, setDeliveryName] = useState(profile?.name || "");
  const [customerCpf, setCustomerCpf] = useState(() => {
    const d = profile?.last_cpf || "";
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  });
  const [customerEmail, setCustomerEmail] = useState(profile?.last_email || "");
  const [customerPhone, setCustomerPhone] = useState(
    profile?.phone ? formatPhone(profile.phone) : ""
  );

  const selectSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setCep("");
      setDeliveryInfo({});
      setHouseNumber("");
      setComplement("");
      return;
    }
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setCep(a.cep);
    setDeliveryInfo({
      cep: a.cep,
      street: a.street,
      neighborhood: a.neighborhood || "",
      city: a.city,
      state: "MS",
      deliveryFee: feeForCity(a.city),
    });
    setHouseNumber(a.house_number);
    setComplement(a.complement || "");
    setOutOfRange(false);
  };

  const handleDeleteAddress = async (e: { stopPropagation: () => void }, id: string) => {
    e.stopPropagation();
    if (!confirm("Excluir este endereço salvo?")) return;
    await deleteAddress(id);
    if (selectedAddressId === id) selectSavedAddress("new");
  };

  const [cepError, setCepError] = useState("");

  // PIX payment state
  const [pixData, setPixData] = useState<CreatePixPaymentResponse | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  // Troco (dinheiro)
  const [needsChange, setNeedsChange] = useState<boolean | null>(null);
  const [changeFor, setChangeFor] = useState<string>("");

  const parsedChangeFor = (() => {
    const n = Number((changeFor || "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  })();

  // Sent screen state
  const [sentOrderId, setSentOrderId] = useState<string | null>(null);
  const [sentOrderTotal, setSentOrderTotal] = useState<number>(0);
  const [sentDailyNumber, setSentDailyNumber] = useState<number | null>(null);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const deliveryFee = deliveryInfo.deliveryFee ?? 0;
  const total = calcTotal(totalQty, payment, deliveryFee);

  const handleCepChange = async (val: string) => {
    const formatted = val
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
    setCep(formatted);
    setCepError("");
    setOutOfRange(false);

    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("lookup-cep", {
          body: { cep: digits },
        });
        if (error || !data || data.error) {
          // Mesmo se falhar, permite preenchimento manual
          setDeliveryInfo({
            cep: formatted,
            street: "",
            neighborhood: "",
            city: data.localidade || "Corumbá",
            state: "MS",
            deliveryFee: feeForCity(data.localidade || "Corumbá"),
          });
          setCepError(data?.error || "Não foi possível buscar o CEP, preencha manualmente.");
        } else {
          setDeliveryInfo({
            cep: formatted,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "Corumbá",
            state: "MS",
            deliveryFee: feeForCity(data.localidade || "Corumbá"),
          });
        }
      } catch {
        setDeliveryInfo({
          cep: formatted,
          street: "",
          neighborhood: "",
          city: "Corumbá",
          state: "MS",
          deliveryFee: feeForCity("Corumbá"),
        });
        setCepError("Erro ao buscar CEP, preencha manualmente.");
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleHouseNumberChange = (val: string) => {
    setHouseNumber(val.replace(/\D/g, ""));
    setOutOfRange(false);
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
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  const isPhoneValid = customerPhone.replace(/\D/g, "").length >= 10;

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    const formatted = digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
    setCustomerPhone(formatted);
  };

  // Validação que muda conforme o método de pagamento
  const canProceedForm = () => {
    const isPhoneEmailValid = isPhoneValid;

    // Se for PIX, exigir CPF
    if (payment === "pix") {
      if (!isCpfValid) return false;
    }

    return (
      deliveryName.trim() &&
      deliveryInfo.street &&
      houseNumber.trim() &&
      cep.replace(/\D/g, "").length === 8 &&
      !outOfRange &&
      (deliveryInfo.deliveryFee ?? 0) > 0 &&
      !cepLoading &&
      isPhoneEmailValid
    );
  };

  const prepareWhatsAppAndNotifyGroup = async (orderId: string): Promise<string | null> => {
    try {
      const { data: msgData, error: msgError } = await buildWhatsAppMessage(orderId);
      if (msgError || !msgData) {
        console.error("Failed to build WhatsApp message:", msgError);
        return null;
      }

      // Build wa.me URL — user will open via manual button (mobile-safe)
      const encodedMsg = encodeURIComponent(msgData.establishmentMessage);
      const url = `https://wa.me/${ESTABLISHMENT_PHONE}?text=${encodedMsg}`;

      // Fire-and-forget Telegram notification to delivery group
      if (msgData.deliveryTelegramMessage) {
        sendTelegramMessage(TELEGRAM_DELIVERY_GROUP_ID, msgData.deliveryTelegramMessage)
          .then((res) => {
            if (!res.success) console.error("Erro ao enviar para grupo Telegram:", res.error);
            else console.log("Mensagem enviada ao grupo Telegram com sucesso");
          })
          .catch((err) => console.error("Erro envio Telegram:", err));
      }

      return url;
    } catch (err) {
      console.error("Erro no envio:", err);
      return null;
    }
  };

  // (daily_order_number agora vem na resposta do edge function — não há leitura direta do banco)

  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    if (payment === "pix") {
      setPixLoading(true);
      setPixError(null);

      const cpfLimpo = customerCpf.replace(/\D/g, "");
      const phoneLimpo = customerPhone.replace(/\D/g, "");

      const payloadDebug = {
        customer_name: deliveryName,
        customer_email: ESTABLISHMENT_EMAIL,
        customer_phone: phoneLimpo,
        customer_cpf: cpfLimpo,
        total_amount: Number(total),
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        order_type: "delivery" as const,
        delivery_info: {
          street: deliveryInfo.street,
          houseNumber,
          complement,
          neighborhood: deliveryInfo.neighborhood,
          city: deliveryInfo.city,
          state: deliveryInfo.state || "MS",
          cep,
        },
      };

      console.log("📤 PAYLOAD ENVIADO:", JSON.stringify(payloadDebug, null, 2));
      console.log("✅ CPF válido?", cpfLimpo.length === 11);
      console.log("✅ Email:", ESTABLISHMENT_EMAIL);
      console.log("✅ Telefone:", phoneLimpo);

      const { data, error } = await createPixPayment(payloadDebug);

      setPixLoading(false);

      if (error || !data) {
        console.error("❌ PIX Error:", error);
        console.error("❌ Data retornada:", data);
        setPixError(error || "Erro ao gerar pagamento PIX");
        return;
      }

      setPixData(data);
      setStep("pix");
    } else {
      setSendLoading(true);
      setSendError(null);

      const { data: orderData, error: orderError } = await createOrder({
        customer_name: deliveryName,
        customer_email: ESTABLISHMENT_EMAIL,
        customer_phone: customerPhone.replace(/\D/g, ""),
        total_amount: Number(total),
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        order_type: "delivery",
        payment_method: payment,
        delivery_info: {
          street: deliveryInfo.street,
          houseNumber,
          complement,
          neighborhood: deliveryInfo.neighborhood,
          city: deliveryInfo.city,
          state: deliveryInfo.state || "MS",
          cep,
          ...(payment === "dinheiro"
            ? {
                needs_change: needsChange === true,
                change_for: needsChange === true ? parsedChangeFor : null,
              }
            : {}),
        },
      });

      if (orderError || !orderData) {
        setSendLoading(false);
        setSendError(orderError || "Erro ao criar pedido");
        return;
      }

      prepareWhatsAppAndNotifyGroup(orderData.order_id);
      setSentOrderId(orderData.order_id);
      setSentOrderTotal(total);
      if (orderData.daily_order_number != null) setSentDailyNumber(orderData.daily_order_number);
      setSendLoading(false);
      setStep("sent");
      clearCart();
    }
  };

  const handlePixApproved = async () => {
    if (pixData?.order_id) {
      prepareWhatsAppAndNotifyGroup(pixData.order_id);
      setSentOrderId(pixData.order_id);
      setSentOrderTotal(pixData.amount ?? total);
      if (pixData.daily_order_number != null) setSentDailyNumber(pixData.daily_order_number);
    }
    setStep("sent");
    clearCart();
  };

  const handlePixExpired = () => {
    setPixError("O tempo para pagamento expirou. Tente novamente.");
    setStep("confirm");
    setPixData(null);
  };

  const availablePayments: PaymentMethod[] = ["dinheiro", "debito", "credito"];

  const stepTitle = () => {
    if (step === "payment") return "Forma de pagamento";
    if (step === "form") return "Endereço de entrega";
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
            {/* STEP 1 — Payment Method */}
            {step === "payment" && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-3">Escolha a forma de pagamento:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {availablePayments.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPayment(p);
                          if (p !== "dinheiro") {
                            setNeedsChange(null);
                            setChangeFor("");
                          }
                        }}
                        className={`p-4 rounded-xl border-2 text-sm font-bold transition-all ${
                          payment === p
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {PAYMENT_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {payment === "pix" && (
                  <div className="bg-muted border border-primary/30 rounded-xl p-3 text-sm font-semibold text-foreground">
                    📲 PIX — Você receberá um QR Code para escanear
                  </div>
                )}

                {(payment === "dinheiro" || payment === "debito" || payment === "credito") && (
                  <div className="bg-muted border border-primary/30 rounded-xl p-3 text-sm font-semibold text-foreground">
                    {payment === "dinheiro" && "💵 Dinheiro — Pague na entrega"}
                    {payment === "debito" && "💳 Débito — Máquina do entregador"}
                    {payment === "credito" && "💳 Crédito — Máquina do entregador"}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => onClose()}
                    className="flex-1 py-3 rounded-xl border-2 border-border text-foreground font-bold hover:bg-muted transition-colors"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={() => setStep("form")}
                    className="flex-1 gradient-hero text-secondary font-display text-xl py-3 rounded-xl shadow-button hover:opacity-90 transition-opacity"
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Form */}
            {step === "form" && (
              <div className="space-y-4 animate-fade-in">
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

                {/* Saved addresses picker */}
                {addresses.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-foreground">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Endereços salvos
                    </label>
                    <div className="space-y-2">
                      {addresses.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => selectSavedAddress(a.id)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-start justify-between gap-2 ${
                            selectedAddressId === a.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-muted hover:border-primary/40"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground text-sm truncate">
                              {a.label || `${a.street}, ${a.house_number}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {a.street}, {a.house_number}
                              {a.complement ? ` (${a.complement})` : ""} — {a.neighborhood || ""}
                            </p>
                            <p className="text-xs text-muted-foreground">CEP {a.cep}</p>
                          </div>
                          <span
                            onClick={(e) => handleDeleteAddress(e, a.id)}
                            className="shrink-0 p-1 rounded-md hover:bg-destructive/10 text-destructive cursor-pointer"
                            aria-label="Excluir endereço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => selectSavedAddress("new")}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                          selectedAddressId === "new"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted hover:border-primary/40"
                        }`}
                      >
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="font-bold text-foreground text-sm">Usar outro endereço</span>
                      </button>
                    </div>
                  </div>
                )}

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
                  {deliveryInfo.street !== undefined && (
                    <>
                      <div className="mt-2">
                        <label className="block text-sm font-bold text-foreground mb-1">Rua *</label>
                        <input
                          type="text"
                          value={deliveryInfo.street || ""}
                          onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, street: e.target.value }))}
                          placeholder="Rua / Logradouro"
                          className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-bold text-foreground mb-1">Bairro *</label>
                        <input
                          type="text"
                          value={deliveryInfo.neighborhood || ""}
                          onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, neighborhood: e.target.value }))}
                          placeholder="Bairro"
                          className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-bold text-foreground mb-1">Cidade / Estado</label>
                        <input
                          type="text"
                          value={`${deliveryInfo.city || "Corumbá"}, MS`}
                          disabled
                          className="w-full border border-border rounded-xl px-4 py-3 text-muted-foreground bg-muted font-semibold cursor-not-allowed"
                        />
                      </div>
                    </>
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

                {(deliveryInfo.deliveryFee ?? 0) > 0 && (
                  <div className="bg-muted border border-primary/30 rounded-xl p-3 text-sm">
                    <p className="text-primary font-bold text-lg">
                      🛵 Taxa de entrega: {formatCurrency(deliveryInfo.deliveryFee ?? 0)}
                    </p>
                  </div>
                )}

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

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">
                    📱 Telefone *
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    inputMode="numeric"
                    className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {customerPhone && !isPhoneValid && (
                    <p className="text-xs text-destructive mt-1">Telefone deve ter pelo menos 10 dígitos</p>
                  )}
                </div>

                {/* CPF - Só mostrar se for PIX */}
                {payment === "pix" && (
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1">
                      🪪 CPF do pagador *
                    </label>
                    <input
                      type="text"
                      value={customerCpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      inputMode="numeric"
                      className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {customerCpf && !isCpfValid && (
                      <p className="text-xs text-destructive mt-1">CPF deve ter 11 dígitos</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("payment")}
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
                  <h3 className="font-display text-lg text-foreground">🚚 Entrega</h3>
                  <p className="text-sm font-semibold">👤 {deliveryName}</p>
                  <p className="text-sm font-semibold">
                    📍 {deliveryInfo.street}, {houseNumber}{complement ? ` (${complement})` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{deliveryInfo.neighborhood} — {deliveryInfo.city}</p>
                  <p className="text-sm font-semibold text-primary">
                    🛵 Taxa de entrega: {formatCurrency(deliveryFee)}
                  </p>
                  <p className="text-sm font-semibold">💳 {PAYMENT_LABELS[payment]}</p>
                </div>

                <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 flex justify-between items-center">
                  <span className="font-display text-xl text-foreground">Total</span>
                  <span className="font-display text-3xl text-primary">{formatCurrency(total)}</span>
                </div>

                {payment === "dinheiro" && (
                  <div className="bg-muted rounded-xl p-4 space-y-3">
                    <h3 className="font-display text-lg text-foreground">💵 Troco</h3>
                    <p className="text-sm font-semibold text-foreground">Precisa de troco?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setNeedsChange(false); setChangeFor(""); }}
                        className={`p-3 rounded-xl border-2 text-base font-bold transition-all ${
                          needsChange === false
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={() => setNeedsChange(true)}
                        className={`p-3 rounded-xl border-2 text-base font-bold transition-all ${
                          needsChange === true
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        Sim
                      </button>
                    </div>
                    {needsChange === true && (
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1">
                          Troco para quantos reais? *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value.replace(/[^\d.,]/g, ""))}
                          placeholder={`Ex.: ${Math.ceil(total / 10) * 10}`}
                          className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {changeFor && (!Number.isFinite(parsedChangeFor) || parsedChangeFor <= total) && (
                          <p className="text-xs text-destructive mt-1">
                            O valor deve ser maior que o total ({formatCurrency(total)}).
                          </p>
                        )}
                        {Number.isFinite(parsedChangeFor) && parsedChangeFor > total && (
                          <p className="text-xs text-primary font-semibold mt-1">
                            Troco a levar: {formatCurrency(parsedChangeFor - total)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {payment === "pix" && (
                  <div className="bg-muted border border-border rounded-xl p-3 text-sm font-semibold text-foreground">
                    📲 Ao confirmar, será gerado um QR Code PIX para pagamento imediato.
                  </div>
                )}

                {(pixError || sendError) && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive font-bold">
                    ⚠️ {pixError || sendError}
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
                    disabled={
                      pixLoading ||
                      sendLoading ||
                      (payment === "dinheiro" && needsChange === null) ||
                      (payment === "dinheiro" &&
                        needsChange === true &&
                        (!Number.isFinite(parsedChangeFor) || parsedChangeFor <= total))
                    }
                    className="flex-1 gradient-hero text-secondary font-display text-xl py-4 rounded-xl shadow-button hover:opacity-90 transition-opacity disabled:opacity-50 disabled:animate-none flex items-center justify-center gap-2 cta-attention"
                  >
                    {pixLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : sendLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "👉 Enviar Pedido 🍗"
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
                  onClick={() => {
                    setStep("confirm");
                    setPixData(null);
                  }}
                  className="w-full py-3 rounded-xl border-2 border-border text-foreground font-bold hover:bg-muted transition-colors"
                >
                  ← Cancelar e voltar
                </button>
              </div>
            )}

            {/* STEP 5 — SENT */}
            {step === "sent" && (
              <div className="text-center py-6 space-y-4 animate-bounce-in">
                <div className="text-6xl">🎉</div>
                <h3 className="font-display text-3xl text-foreground">Pedido Criado!</h3>

                {sentDailyNumber !== null && (
                  <div className="bg-primary/10 border-2 border-primary rounded-xl p-4">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Seu pedido</p>
                    <p className="font-display text-4xl text-primary">#{sentDailyNumber}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      Total: {formatCurrency(sentOrderTotal)}
                    </p>
                  </div>
                )}

                {payment === "pix" && (
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-foreground font-semibold text-sm flex items-center justify-center gap-2">
                    ✅ Pagamento PIX confirmado!
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl border-2 border-border text-foreground font-bold hover:bg-muted transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}