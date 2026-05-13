import { useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export default function WelcomeModal() {
  const { needsOnboarding, login, loading } = useProfile();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !needsOnboarding) return null;

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    const formatted = digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
    setPhone(formatted);
  };

  const isPhoneValid = phone.replace(/\D/g, "").length >= 10;
  const isNameValid = name.trim().length >= 2;
  const canSubmit = isPhoneValid && isNameValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await login(phone, name.trim());
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <>
      <div className="fixed inset-0 bg-secondary/70 z-[60] backdrop-blur-sm" />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
          <div className="gradient-hero p-6 text-center">
            <img src={logo} alt="Logo" className="w-20 h-20 rounded-full mx-auto border-4 border-secondary/20 shadow-xl" />
            <h2 className="font-display text-3xl text-secondary mt-3">Bem-vindo(a)!</h2>
            <p className="text-secondary/90 font-bold mt-1">Casa do Frango Assado da 21 🍗</p>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-foreground font-semibold text-center">
              Para começar, conta pra gente seu nome e telefone:
            </p>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1">👤 Seu nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "").slice(0, 100))}
                placeholder="Ex: Maria Silva"
                className="w-full border border-border rounded-xl px-4 py-3 text-lg text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1">📱 Seu telefone *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                maxLength={15}
                className="w-full border border-border rounded-xl px-4 py-3 text-lg text-foreground bg-background font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {phone && !isPhoneValid && (
                <p className="text-xs text-destructive mt-1">Telefone deve ter pelo menos 10 dígitos</p>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive font-bold">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full gradient-hero text-secondary font-display text-2xl py-4 rounded-xl shadow-button hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Entrando...
                </>
              ) : (
                "Começar 🍗"
              )}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Seus dados ficam salvos para os próximos pedidos.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
