import { useEffect, useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import { listCustomerOrders, CustomerOrder } from "@/services/profileService";
import { formatCurrency } from "@/types/order";
import { X, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "PIX pendente", cls: "bg-yellow-100 text-yellow-800" },
  paid: { label: "PIX pago", cls: "bg-green-100 text-green-800" },
  pending_dinheiro: { label: "Pgto. dinheiro", cls: "bg-blue-100 text-blue-800" },
  pending_debito: { label: "Pgto. débito", cls: "bg-blue-100 text-blue-800" },
  pending_credito: { label: "Pgto. crédito", cls: "bg-blue-100 text-blue-800" },
  pending_cash: { label: "Pgto. dinheiro", cls: "bg-blue-100 text-blue-800" },
  pending_debit: { label: "Pgto. débito", cls: "bg-blue-100 text-blue-800" },
  pending_credit: { label: "Pgto. crédito", cls: "bg-blue-100 text-blue-800" },
  failed: { label: "Falhou", cls: "bg-red-100 text-red-800" },
};

export default function MyOrdersModal({ onClose }: { onClose: () => void }) {
  const { profile } = useProfile();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listCustomerOrders(profile.phone).then(({ data, error: err }) => {
      if (err) setError(err);
      else setOrders(data?.orders || []);
      setLoading(false);
    });
  }, [profile]);

  return (
    <>
      <div className="fixed inset-0 bg-secondary/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-card rounded-t-3xl md:rounded-2xl w-full md:max-w-lg shadow-2xl flex flex-col max-h-[92vh] animate-fade-in overflow-hidden">
          <div className="gradient-hero p-5 flex items-center justify-between shrink-0">
            <h2 className="font-display text-2xl text-secondary">📜 Meus pedidos</h2>
            <button onClick={onClose} className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center">
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            {error && <p className="text-destructive font-bold">{error}</p>}
            {!loading && !error && orders.length === 0 && (
              <p className="text-center text-muted-foreground py-10 font-semibold">
                Você ainda não fez nenhum pedido. 🍗
              </p>
            )}
            {orders.map((o) => {
              const status = STATUS_LABELS[o.payment_status] || { label: o.payment_status, cls: "bg-gray-100 text-gray-800" };
              const date = new Date(o.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
              });
              const totalQty = o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
              return (
                <div key={o.id} className="bg-muted rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {o.daily_order_number !== null && (
                        <span className="font-display text-lg text-primary">#{o.daily_order_number}</span>
                      )}
                      <span className="text-sm font-semibold text-muted-foreground">{date}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${status.cls}`}>{status.label}</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {totalQty}x frango assado · {o.order_type === "delivery" ? "🛵 Entrega" : "🏃 Retirada"}
                  </p>
                  <p className="font-display text-lg text-foreground">{formatCurrency(Number(o.total_amount))}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
