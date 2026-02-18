import React, { createContext, useContext, useState } from "react";
import { CartItem } from "@/types/order";

interface CartContextType {
  items: CartItem[];
  quantity: number;
  addItem: (qty: number) => void;
  updateItem: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const quantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const addItem = (qty: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === "frango");
      if (existing) {
        return prev.map((i) =>
          i.id === "frango" ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [
        ...prev,
        { id: "frango", name: "Frango Assado + Coca 2L + Farofa", quantity: qty, unitPrice: 50 },
      ];
    });
    setIsCartOpen(true);
  };

  const updateItem = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider
      value={{
        items,
        quantity,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
