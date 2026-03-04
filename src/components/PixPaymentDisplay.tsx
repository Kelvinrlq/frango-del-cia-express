import { useState, useEffect } from "react";
import { Copy, Check, Clock } from "lucide-react";
import { formatCurrency } from "@/types/order";

interface PixPaymentDisplayProps {
  qrCodeBase64: string | null;
  pixKey: string | null;
  amount: number;
  expiresAt: string;
}

export default function PixPaymentDisplay({
  qrCodeBase64,
  pixKey,
  amount,
  expiresAt,
}: PixPaymentDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const exp = new Date(expiresAt).getTime();
      const diff = Math.max(0, exp - now);
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = async () => {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = pixKey;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center">
        <p className="font-display text-xl text-foreground">Pague via PIX</p>
        <p className="text-muted-foreground text-sm font-semibold">
          Escaneie o QR Code ou copie a chave abaixo
        </p>
      </div>

      {/* QR Code */}
      {qrCodeBase64 && (
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code PIX"
              className="w-56 h-56"
            />
          </div>
        </div>
      )}

      {/* Amount */}
      <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground font-semibold">Valor a pagar</p>
        <p className="font-display text-3xl text-primary">{formatCurrency(amount)}</p>
      </div>

      {/* Copy PIX key */}
      {pixKey && (
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/10 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copiar código PIX
            </>
          )}
        </button>
      )}

      {/* Timer */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-semibold">
        <Clock className="w-4 h-4" />
        <span>Expira em {timeLeft}</span>
      </div>

      {/* Instructions */}
      <div className="bg-muted rounded-xl p-4 space-y-2 text-sm font-semibold text-foreground">
        <p>📱 <strong>Como pagar:</strong></p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Abra o app do seu banco</li>
          <li>Escolha pagar com PIX</li>
          <li>Escaneie o QR Code ou cole o código</li>
          <li>Confirme o pagamento</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-2">
          O pedido será enviado automaticamente após a confirmação do pagamento.
        </p>
      </div>
    </div>
  );
}
