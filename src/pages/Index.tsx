import { useState } from "react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar";
import OrderModal from "@/components/OrderModal";
import { CartProvider, useCart } from "@/context/CartContext";
import logo from "@/assets/logo.png";

function HomeContent() {
  const [showOrder, setShowOrder] = useState(false);
  const { openCart } = useCart();

  return (
    <div className="min-h-screen gradient-warm">
      <Header onCartClick={openCart} />

      {/* Hero */}
      <section className="gradient-hero py-10 px-4">
        <div className="container mx-auto flex flex-col items-center text-center gap-4">
          <img
            src={logo}
            alt="Casa do Frango Assado da 21"
            className="w-28 h-28 md:w-36 md:h-36 rounded-full shadow-2xl border-4 border-secondary/20"
          />
          <h1 className="font-display text-5xl md:text-7xl font-black text-secondary leading-tight drop-shadow tracking-tight">
            Casa do Frango<br />Assado da 21
          </h1>
          <p className="text-secondary/90 font-bold text-xl md:text-2xl max-w-sm leading-relaxed">
            O frango mais gostoso da cidade — assado na hora, direto pra você! 🍗
          </p>
          <div className="flex gap-3 flex-wrap justify-center mt-2">
            {["🚚 Entrega", "🏪 Retirada", "💰 Pix • Dinheiro • Cartão"].map((tag) => (
              <span key={tag} className="bg-secondary/10 text-secondary font-bold text-base md:text-lg px-5 py-2 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Product */}
      <section className="py-10 px-4">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl font-black text-foreground text-center mb-6 tracking-tight">Nosso Produto</h2>
          <ProductCard />
        </div>
      </section>

      {/* How it works */}
      <section className="pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-4xl font-black text-foreground text-center mb-6 tracking-tight">Como funciona?</h2>
          <div className="grid gap-4">
            {[
              { icon: "🛒", title: "Escolha a quantidade", desc: "Adicione quantos frangos quiser ao seu pedido." },
              { icon: "📍", title: "Retirada ou entrega", desc: "Busque no estabelecimento ou receba em casa." },
              { icon: "💳", title: "Escolha o pagamento", desc: "PIX, dinheiro, débito ou crédito (entrega). Retirada: somente PIX." },
              { icon: "📲", title: "Pedido confirmado pelo WhatsApp", desc: "Você recebe a confirmação direto no seu WhatsApp." },
            ].map((step, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 flex gap-4 items-start shadow-card">
                <span className="text-4xl">{step.icon}</span>
                <div>
                  <p className="font-display text-xl font-bold text-foreground leading-snug">{step.title}</p>
                  <p className="text-muted-foreground font-semibold text-base mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-primary py-6 text-center">
        <p className="font-display text-2xl font-bold">Casa do Frango Assado da 21</p>
        <p className="text-primary/70 font-semibold text-base mt-1">© 2025 — Todos os direitos reservados</p>
      </footer>

      <CartSidebar onCheckout={() => setShowOrder(true)} />
      {showOrder && <OrderModal onClose={() => setShowOrder(false)} />}
    </div>
  );
}

export default function Index() {
  return (
    <CartProvider>
      <HomeContent />
    </CartProvider>
  );
}
