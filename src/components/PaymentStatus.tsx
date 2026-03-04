import { useEffect, useRef, useState } from "react";
import { checkPaymentStatus } from "@/services/paymentService";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface PaymentStatusProps {
  mercadopagoPaymentId: number | string;
  onApproved: () => void;
  onExpired: () => void;
  expiresAt: string;
}

export default function PaymentStatus({
  mercadopagoPaymentId,
  onApproved,
  onExpired,
  expiresAt,
}: PaymentStatusProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "cancelled">("pending");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      // Check if expired
      if (new Date(expiresAt).getTime() < Date.now()) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onExpired();
        return;
      }

      const { data, error: err } = await checkPaymentStatus(mercadopagoPaymentId);
      if (!active) return;

      if (err) {
        setError(err);
        return;
      }

      if (data) {
        setStatus(data.status);
        setError(null);

        if (data.status === "approved") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onApproved();
        } else if (data.status === "rejected" || data.status === "cancelled") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    };

    // Poll every 3 seconds
    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mercadopagoPaymentId, expiresAt, onApproved, onExpired]);

  if (status === "approved") {
    return (
      <div className="flex items-center justify-center gap-2 py-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-700 dark:text-green-400 font-bold animate-fade-in">
        <CheckCircle2 className="w-5 h-5" />
        Pagamento confirmado!
      </div>
    );
  }

  if (status === "rejected" || status === "cancelled") {
    return (
      <div className="flex items-center justify-center gap-2 py-3 bg-destructive/10 rounded-xl text-destructive font-bold animate-fade-in">
        <XCircle className="w-5 h-5" />
        Pagamento {status === "rejected" ? "rejeitado" : "cancelado"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2 py-3 bg-muted rounded-xl text-muted-foreground font-semibold">
        <Loader2 className="w-5 h-5 animate-spin" />
        Aguardando pagamento...
      </div>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
