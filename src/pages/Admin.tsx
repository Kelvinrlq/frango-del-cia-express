import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, MapPin, Phone, MessageCircle, LogOut, Trash2 } from "lucide-react";
import { formatCurrency } from "@/types/order";

const ADMIN_PASSWORD = "frango21";
const AUTH_KEY = "admin_authed_v1";
const ESTABLISHMENT_PHONE = "556793277165";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface DeliveryInfo {
  street?: string;
  houseNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  deliveryFee?: number;
}

interface OrderRow {
  id: string;
  order_number: number;
  daily_order_number: number | null;
  order_date: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_amount: number;
  payment_status: string;
  order_type: string;
  items: OrderItem[];
  delivery_info: DeliveryInfo | null;
  notes: string | null;
  created_at: string;
}

const PAYMENT_STATUS_LABEL: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { text: "PIX pendente", variant: "outline" },
  paid: { text: "✅ PIX pago", variant: "default" },
  pending_dinheiro: { text: "💵 Dinheiro (a pagar)", variant: "secondary" },
  pending_debito: { text: "💳 Débito (a pagar)", variant: "secondary" },
  pending_credito: { text: "💳 Crédito (a pagar)", variant: "secondary" },
  // Legados em inglês — mantidos para compatibilidade com pedidos antigos
  pending_cash: { text: "💵 Dinheiro (a pagar)", variant: "secondary" },
  pending_debit: { text: "💳 Débito (a pagar)", variant: "secondary" },
  pending_credit: { text: "💳 Crédito (a pagar)", variant: "secondary" },
  completed: { text: "✅ Concluído", variant: "default" },
  failed: { text: "❌ Falhou", variant: "destructive" },
  cancelled: { text: "Cancelado", variant: "destructive" },
  expired: { text: "Expirado", variant: "destructive" },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildWhatsAppLink(phone: string, name: string, dailyNumber: number | null) {
  const cleaned = phone.replace(/\D/g, "");
  const intl = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  const numLabel = dailyNumber ? `#${dailyNumber}` : "";
  const msg = encodeURIComponent(
    `Olá ${name}! Sobre o seu pedido ${numLabel} da Casa do Frango Assado da 21 🍗`
  );
  return `https://wa.me/${intl}?text=${msg}`;
}

function buildMapsLink(d: DeliveryInfo) {
  const q = encodeURIComponent(
    `${d.street}, ${d.houseNumber}, ${d.neighborhood}, ${d.city || "Corumbá"}, ${d.state || "MS"}`
  );
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean>(() => localStorage.getItem(AUTH_KEY) === "1");
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterToday, setFilterToday] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("orders")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("*" as any)
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterToday) {
        const today = new Date().toISOString().slice(0, 10);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = (query as any).eq("order_date", today);
      }

      const { data, error: err } = await query;
      if (err) {
        setError(err.message);
        setOrders([]);
      } else {
        setOrders((data ?? []) as unknown as OrderRow[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [filterToday]);

  useEffect(() => {
    if (!authed) return;
    fetchOrders();

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed, fetchOrders]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
      setPwdError("");
    } else {
      setPwdError("Senha incorreta");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPwd("");
  };

  const handleDelete = async (orderId: string, dailyNum: number | null) => {
    setDeletingId(orderId);
    try {
      const { error } = await supabase.functions.invoke("delete-order", {
        body: { order_id: orderId },
        headers: { "x-admin-password": ADMIN_PASSWORD },
      });

      if (error) {
        console.error("Delete error:", error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o pedido. Tente novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pedido excluído",
          description: `Pedido ${dailyNum ? `#${dailyNum}` : ""} removido com sucesso.`,
        });
        // O realtime já remove o card; mas atualizamos manualmente como fallback
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro inesperado",
        description: e instanceof Error ? e.message : "Falha ao excluir pedido.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">🔐 Painel Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="pwd" className="text-sm font-semibold text-foreground">
                  Senha
                </label>
                <Input
                  id="pwd"
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="Digite a senha"
                  autoFocus
                  className="mt-1"
                />
                {pwdError && (
                  <p className="text-sm text-destructive font-semibold mt-1">{pwdError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-foreground">📋 Pedidos</h1>
            <p className="text-sm text-muted-foreground">
              {orders.length} pedido{orders.length !== 1 ? "s" : ""}
              {filterToday ? " hoje" : " (todos)"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterToday((v) => !v)}
            >
              {filterToday ? "Ver todos" : "Só de hoje"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive font-semibold">⚠️ {error}</p>
            </CardContent>
          </Card>
        )}

        {loading && orders.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && orders.length === 0 && !error && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhum pedido encontrado.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {orders.map((o) => {
            const statusInfo = PAYMENT_STATUS_LABEL[o.payment_status] || {
              text: o.payment_status,
              variant: "outline" as const,
            };
            const isDelivery = o.order_type === "delivery";
            const dailyNum = o.daily_order_number;

            return (
              <Card key={o.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-2xl font-display flex items-center gap-2">
                        {dailyNum ? `#${dailyNum}` : `#${o.order_number}`}
                        <span className="text-base text-muted-foreground font-normal">
                          {isDelivery ? "🏍️ Entrega" : "🏪 Retirada"}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(o.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                      <p className="font-display text-xl text-primary">
                        {formatCurrency(Number(o.total_amount))}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div>
                    <p className="font-bold text-foreground">{o.customer_name}</p>
                    <a
                      href={`tel:${o.customer_phone}`}
                      className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {o.customer_phone}
                    </a>
                  </div>

                  {isDelivery && o.delivery_info && (
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <p className="font-semibold text-foreground">
                        {o.delivery_info.street}, {o.delivery_info.houseNumber}
                        {o.delivery_info.complement ? ` (${o.delivery_info.complement})` : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {o.delivery_info.neighborhood} — {o.delivery_info.city || "Corumbá"}/
                        {o.delivery_info.state || "MS"}
                      </p>
                      <a
                        href={buildMapsLink(o.delivery_info)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-semibold text-sm flex items-center gap-1 mt-1 hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Ver no Google Maps
                      </a>
                    </div>
                  )}

                  {o.notes && (
                    <p className="text-sm bg-secondary/10 rounded-lg p-2 font-semibold text-foreground">
                      📝 {o.notes}
                    </p>
                  )}

                  <div className="text-sm">
                    <p className="font-bold text-foreground mb-1">Itens:</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {o.items.map((it, idx) => (
                        <li key={idx}>
                          • {it.quantity}× {it.name} —{" "}
                          {formatCurrency(it.quantity * it.unitPrice)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <a
                      href={buildWhatsAppLink(o.customer_phone, o.customer_name, dailyNum)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp do cliente
                      </Button>
                    </a>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === o.id}
                          aria-label="Excluir pedido"
                        >
                          {deletingId === o.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Excluir pedido {dailyNum ? `#${dailyNum}` : `#${o.order_number}`}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é permanente. O pedido de <strong>{o.customer_name}</strong> e
                            seus dados de pagamento serão removidos do sistema. Não dá para desfazer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(o.id, dailyNum)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sim, excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Atualização automática em tempo real • Estabelecimento: {ESTABLISHMENT_PHONE}
        </p>
      </div>
    </div>
  );
}
