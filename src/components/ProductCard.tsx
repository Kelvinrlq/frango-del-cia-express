import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Plus, Minus } from "lucide-react";
import frangoHero from "@/assets/frango-hero.jpg";
import { formatCurrency } from "@/types/order";

export default function ProductCard() {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    setQty(1);
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-card max-w-sm mx-auto animate-fade-in">
      {/* Image */}
      <div className="relative overflow-hidden h-56">
        <img
          src={frangoHero}
          alt="Frango assado com farofa e Coca-Cola"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-primary text-primary-foreground font-display text-sm px-3 py-1 rounded-full shadow">
          🔥 Mais Vendido
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display text-3xl font-black text-foreground leading-tight tracking-tight">
          Frango Assado Completo
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {["🍗 Frango Inteiro", "🥤 Coca 2L", "🌽 Farofa"].map((tag) => (
            <span
              key={tag}
              className="text-sm bg-muted text-muted-foreground font-bold px-3 py-1.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-muted-foreground text-base font-bold">A partir de</p>
            <p className="font-display text-5xl font-black text-primary leading-none">{formatCurrency(50)}</p>
            <p className="text-sm text-muted-foreground font-semibold mt-1">Pix ou dinheiro</p>
          </div>

          {/* Qty selector */}
          <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg bg-card flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors font-bold shadow-sm"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-display text-2xl text-foreground w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-9 h-9 rounded-lg bg-card flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleAdd}
          className={`mt-4 w-full py-5 rounded-xl font-display text-2xl font-black transition-all shadow-button ${
            added
              ? "bg-green-500 text-white scale-95"
              : "gradient-hero text-secondary hover:opacity-90"
          }`}
        >
          {added ? "✓ Adicionado!" : "Adicionar ao Pedido"}
        </button>
      </div>

      {/* Payment info */}
      <div className="bg-muted px-5 py-4 grid grid-cols-2 gap-3 text-sm font-bold">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>💳 Débito:</span>
          <span className="text-foreground">{formatCurrency(51)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>💳 Crédito:</span>
          <span className="text-foreground">{formatCurrency(52.5)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>💰 Dinheiro:</span>
          <span className="text-foreground">{formatCurrency(50)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>📲 Pix:</span>
          <span className="text-foreground">{formatCurrency(50)}</span>
        </div>
      </div>
    </div>
  );
}
