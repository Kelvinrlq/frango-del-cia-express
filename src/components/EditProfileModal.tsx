import { useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import { X, Loader2 } from "lucide-react";

export default function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useProfile();
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(() => {
    const d = profile?.phone || "";
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    const formatted = digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
    setPhone(formatted);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const newPhoneClean = phone.replace(/\D/g, "");
    const payload: { name?: string; new_phone?: string } = {};
    if (name.trim() && name.trim() !== profile?.name) payload.name = name.trim();
    if (newPhoneClean && newPhoneClean !== profile?.phone) payload.new_phone = newPhoneClean;
    if (Object.keys(payload).length === 0) {
      setSaving(false);
      onClose();
      return;
    }
    const { error: err } = await updateProfile(payload);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-secondary/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-card rounded-t-3xl md:rounded-2xl w-full md:max-w-md shadow-2xl animate-fade-in overflow-hidden">
          <div className="gradient-hero p-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-secondary">Meus dados</h2>
            <button onClick={onClose} className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center">
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">👤 Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "").slice(0, 100))}
                className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">📱 Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                inputMode="numeric"
                maxLength={15}
                className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background font-semibold"
              />
            </div>
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive font-bold">
                ⚠️ {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-hero text-secondary font-display text-xl py-3 rounded-xl shadow-button disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
