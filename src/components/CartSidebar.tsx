import { useCart } from "@/context/CartContext";
import { ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/types/order";

interface CartSidebarProps {
  onCheckout: () => void;
}

export default function CartSidebar({ onCheckout }: CartSidebarProps) {
  const { items, quantity, updateItem, removeItem, clearCart, isCartOpen, closeCart } = useCart();

  if (!isCartOpen) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-secondary/60 z-40 backdrop-blur-sm"
        onClick={closeCart}
      />

      {/* Sidebar */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-sm bg-card z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="gradient-hero p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-secondary" />
            <span className="font-display text-xl text-secondary">
              Meu Pedido {quantity > 0 && `(${quantity})`}
            </span>
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary/20 transition-colors"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <ShoppingBag className="w-16 h-16 opacity-30" />
              <p className="text-lg font-semibold">Seu carrinho está vazio</p>
              <p className="text-sm text-center">Adicione o delicioso frango assado!</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-muted rounded-xl p-4 flex gap-3 items-start shadow-sm"
              >
                <div className="flex-1">
                  <p className="font-bold text-sm text-foreground leading-tight">{item.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {formatCurrency(item.unitPrice)} cada
                  </p>
                  <p className="font-display text-primary text-lg mt-1">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:opacity-70 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 bg-card rounded-lg border border-border p-1">
                    <button
                      onClick={() => updateItem(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold w-6 text-center text-foreground">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-semibold">Subtotal</span>
              <span className="font-display text-xl text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              * Taxa de entrega calculada no próximo passo
            </p>
            <button
              onClick={() => { closeCart(); onCheckout(); }}
              className="w-full gradient-hero text-secondary font-display text-xl py-4 rounded-xl shadow-button hover:opacity-90 transition-opacity"
            >
              Finalizar Pedido 🍗
            </button>
            <button
              onClick={clearCart}
              className="w-full text-muted-foreground text-sm hover:text-destructive transition-colors"
            >
              Limpar carrinho
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
