import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StoreStatus {
  isOpen: boolean;
  closedMessage: string | null;
  loading: boolean;
}

export function useStoreStatus(): StoreStatus {
  const [isOpen, setIsOpen] = useState(true);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("is_open, closed_message")
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setIsOpen(data.is_open);
        setClosedMessage(data.closed_message);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("store-settings-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings" },
        (payload) => {
          const row = payload.new as { is_open?: boolean; closed_message?: string | null };
          if (typeof row?.is_open === "boolean") setIsOpen(row.is_open);
          setClosedMessage(row?.closed_message ?? null);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { isOpen, closedMessage, loading };
}
