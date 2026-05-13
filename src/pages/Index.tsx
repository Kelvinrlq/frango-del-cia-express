import { useState } from "react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar";
import OrderModal from "@/components/OrderModal";
import WelcomeModal from "@/components/WelcomeModal";
import { CartProvider, useCart } from "@/context/CartContext";
import { ProfileProvider } from "@/context/ProfileContext";
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
        </div>
      </section>

      {/* Product */}
      <section className="py-10 px-4">
        <div className="container mx-auto">
          <h2 className="font-display text-4xl font-black text-foreground text-center mb-6 tracking-tight">Nosso Produto</h2>
          <ProductCard />
        </div>
      </section>

     {/* Footer */}
<footer className="bg-secondary text-primary py-6 text-center space-y-2">
  <p className="font-display text-2xl font-bold">Casa do Frango Assado da 21</p>
  <p className="text-primary/70 font-semibold text-base">© 2026 Casa do Frango Assado da 21. Todos os direitos reservados.</p>
  <p className="text-primary/60 font-semibold text-sm">Desenvolvido por Kelvin Lucas Saucedo</p>
</footer>

      <CartSidebar onCheckout={() => setShowOrder(true)} />
      {showOrder && <OrderModal onClose={() => setShowOrder(false)} />}
      <WelcomeModal />
    </div>
  );
}

export default function Index() {
  return (
    <ProfileProvider>
      <CartProvider>
        <HomeContent />
      </CartProvider>
    </ProfileProvider>
  );
}
