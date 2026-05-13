import { useState } from "react";
import { ShoppingBag, ChevronDown, ListOrdered, Pencil, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { useCart } from "@/context/CartContext";
import { useProfile } from "@/context/ProfileContext";
import MyOrdersModal from "@/components/MyOrdersModal";
import EditProfileModal from "@/components/EditProfileModal";

interface HeaderProps {
  onCartClick: () => void;
}

export default function Header({ onCartClick }: HeaderProps) {
  const { quantity } = useCart();
  const { profile, logout } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-secondary shadow-md">
        <div className="container mx-auto flex items-center justify-between py-3 px-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="Casa do Frango Assado da 21" className="w-14 h-14 rounded-full object-cover shrink-0" />
            <div className="hidden sm:block">
              <p className="font-display font-black text-primary text-xl leading-tight">Casa do Frango</p>
              <p className="font-display font-bold text-primary text-base opacity-80">Assado da 21</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profile && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1 bg-secondary/20 hover:bg-secondary/30 text-primary font-bold text-sm px-3 py-2 rounded-xl"
                >
                  <span className="hidden sm:inline">Olá, </span>
                  <span className="truncate max-w-[100px]">{profile.name.split(" ")[0]}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-2xl border border-border overflow-hidden z-50">
                      <button
                        onClick={() => { setMenuOpen(false); setShowOrders(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-foreground font-semibold hover:bg-muted text-left"
                      >
                        <ListOrdered className="w-5 h-5 text-primary" /> Meus pedidos
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setShowEdit(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-foreground font-semibold hover:bg-muted text-left"
                      >
                        <Pencil className="w-5 h-5 text-primary" /> Editar meus dados
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-destructive font-semibold hover:bg-muted text-left border-t border-border"
                      >
                        <LogOut className="w-5 h-5" /> Sou outra pessoa
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={onCartClick}
              className="relative flex items-center gap-2 gradient-hero text-secondary font-black text-base px-5 py-3 rounded-xl shadow-button hover:opacity-90 transition-opacity"
            >
              <ShoppingBag className="w-6 h-6" />
              <span className="hidden sm:inline font-display font-black text-lg">Meu Pedido</span>
              {quantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-display w-6 h-6 rounded-full flex items-center justify-center animate-bounce-in">
                  {quantity}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {showOrders && <MyOrdersModal onClose={() => setShowOrders(false)} />}
      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
    </>
  );
}
