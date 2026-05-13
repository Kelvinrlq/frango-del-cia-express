import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  CustomerProfile,
  CustomerAddress,
  getOrCreateProfile,
  updateProfile as svcUpdateProfile,
  upsertAddress as svcUpsertAddress,
  deleteAddress as svcDeleteAddress,
} from "@/services/profileService";

const STORAGE_KEY = "cfa21:active_phone";

interface ProfileContextType {
  profile: CustomerProfile | null;
  addresses: CustomerAddress[];
  loading: boolean;
  needsOnboarding: boolean;
  login: (phone: string, name: string) => Promise<{ error: string | null }>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (payload: { name?: string; new_phone?: string }) => Promise<{ error: string | null }>;
  upsertAddress: (address: Partial<CustomerAddress>) => Promise<{ error: string | null }>;
  deleteAddress: (id: string) => Promise<{ error: string | null }>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const loadProfile = useCallback(async (phone: string) => {
    const { data } = await getOrCreateProfile(phone);
    if (data?.profile) {
      setProfile(data.profile);
      setAddresses(data.addresses || []);
      setNeedsOnboarding(false);
    } else {
      // Phone stored but no profile (or error) — re-prompt
      localStorage.removeItem(STORAGE_KEY);
      setProfile(null);
      setAddresses([]);
      setNeedsOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const phone = localStorage.getItem(STORAGE_KEY);
    if (phone) {
      loadProfile(phone).finally(() => setLoading(false));
    } else {
      setNeedsOnboarding(true);
      setLoading(false);
    }
  }, [loadProfile]);

  const login = useCallback(async (phone: string, name: string) => {
    const phoneClean = phone.replace(/\D/g, "");
    const { data, error } = await getOrCreateProfile(phoneClean, name);
    if (error || !data?.profile) return { error: error || "Erro ao criar perfil" };
    localStorage.setItem(STORAGE_KEY, phoneClean);
    setProfile(data.profile);
    setAddresses(data.addresses || []);
    setNeedsOnboarding(false);
    return { error: null };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setAddresses([]);
    setNeedsOnboarding(true);
  }, []);

  const refresh = useCallback(async () => {
    if (profile?.phone) await loadProfile(profile.phone);
  }, [profile, loadProfile]);

  const updateProfile = useCallback(async (payload: { name?: string; new_phone?: string }) => {
    if (!profile) return { error: "Sem perfil" };
    const { data, error } = await svcUpdateProfile(profile.phone, payload);
    if (error || !data) return { error: error || "Erro" };
    setProfile(data.profile);
    if (data.profile.phone !== profile.phone) {
      localStorage.setItem(STORAGE_KEY, data.profile.phone);
    }
    return { error: null };
  }, [profile]);

  const upsertAddress = useCallback(async (address: Partial<CustomerAddress>) => {
    if (!profile) return { error: "Sem perfil" };
    const { error } = await svcUpsertAddress(profile.phone, address);
    if (error) return { error };
    await loadProfile(profile.phone);
    return { error: null };
  }, [profile, loadProfile]);

  const deleteAddress = useCallback(async (id: string) => {
    if (!profile) return { error: "Sem perfil" };
    const { error } = await svcDeleteAddress(profile.phone, id);
    if (error) return { error };
    await loadProfile(profile.phone);
    return { error: null };
  }, [profile, loadProfile]);

  return (
    <ProfileContext.Provider
      value={{ profile, addresses, loading, needsOnboarding, login, logout, refresh, updateProfile, upsertAddress, deleteAddress }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
