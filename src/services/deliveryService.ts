import { supabase } from "@/integrations/supabase/client";

/**
 * Tabela de taxas por distância arredondada (km).
 */
const FEE_TABLE: [number, number][] = [
  [1.0, 7.0],
  [1.5, 8.5],
  [2.0, 9.5],
  [2.5, 11.0],
  [3.0, 12.0],
  [3.5, 13.5],
  [4.0, 15.0],
];

/**
 * Calcula a taxa de entrega com base na distância em km.
 * Retorna null se acima de 4 km.
 */
export function calculateDeliveryFee(distanceKm: number): number | null {
  const roundedKm = Math.round(distanceKm * 2) / 2;
  for (const [maxKm, fee] of FEE_TABLE) {
    if (roundedKm <= maxKm) return fee;
  }
  return null; // fora da área de cobertura
}

export interface DeliveryDistanceResult {
  distanceKm: number;
  roundedKm: number;
  fee: number | null;
  error?: string;
}

/**
 * Chama a edge function para calcular distância e retorna a taxa.
 */
export async function getDeliveryDistance(
  street: string,
  number: string,
  neighborhood: string,
  city: string,
  state?: string,
  zipCode?: string
): Promise<DeliveryDistanceResult> {
  const { data, error } = await supabase.functions.invoke("calculate-delivery", {
    body: { street, number, neighborhood, city, state, zipCode },
  });

  if (error) {
    console.error("Edge function error:", error);
    return { distanceKm: 0, roundedKm: 0, fee: null, error: "Erro ao calcular distância. Tente novamente." };
  }

  if (data.error) {
    return { distanceKm: 0, roundedKm: 0, fee: null, error: data.error };
  }

  const fee = calculateDeliveryFee(data.distanceKm);
  return {
    distanceKm: data.distanceKm,
    roundedKm: data.roundedKm,
    fee,
  };
}
