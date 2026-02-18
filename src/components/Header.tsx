import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import logo from "@/assets/logo.png";
import { useCart } from "@/context/CartContext";

interface HeaderProps {
  onCartClick: () => void;
}

export default function Header({ onCartClick }: HeaderProps) {
  const { quantity } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-secondary shadow-md">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Casa do Frango Assado da 21" className="w-14 h-14 rounded-full object-cover" />
          <div className="hidden sm:block">
            <p className="font-display text-primary text-xl leading-tight">Casa do Frango</p>
            <p className="font-display text-primary text-sm opacity-80">Assado da 21</p>
          </div>
        </div>

        {/* Cart button */}
        <button
          onClick={onCartClick}
          className="relative flex items-center gap-2 gradient-hero text-secondary font-bold px-4 py-2.5 rounded-xl shadow-button hover:opacity-90 transition-opacity"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="hidden sm:inline font-display text-base">Meu Pedido</span>
          {quantity > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-display w-6 h-6 rounded-full flex items-center justify-center animate-bounce-in">
              {quantity}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
