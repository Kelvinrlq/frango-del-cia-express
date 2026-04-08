/**
 * Taxa fixa de entrega para Corumbá: R$ 10,00
 */
const FIXED_DELIVERY_FEE = 10.0;

export interface DeliveryDistanceResult {
  distanceKm: number;
  roundedKm: number;
  fee: number | null;
  error?: string;
}

/**
 * Retorna taxa fixa de R$ 10,00 para Corumbá
 */
export async function getDeliveryDistance(
  street: string,
  number: string,
  neighborhood: string,
  city: string,
  state?: string,
  zipCode?: string
): Promise<DeliveryDistanceResult> {
  // Para Corumbá, retorna taxa fixa
  if (city.toLowerCase() === "corumbá" || city.toLowerCase() === "corumba") {
    return {
      distanceKm: 0,
      roundedKm: 0,
      fee: FIXED_DELIVERY_FEE,
    };
  }

  // Fora de Corumbá, sem entrega
  return {
    distanceKm: 0,
    roundedKm: 0,
    fee: null,
    error: "Entrega disponível apenas em Corumbá",
  };
}