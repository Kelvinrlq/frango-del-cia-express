export type OrderType = "delivery" | "pickup";

export type PaymentMethod =
  | "pix"
  | "dinheiro"
  | "debito"
  | "credito";

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface DeliveryInfo {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state?: string;
  houseNumber: string;
  complement?: string;
  deliveryFee: number;
}

export interface PickupInfo {
  name: string;
  time: string;
}

export interface Order {
  type: OrderType;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  delivery?: DeliveryInfo;
  pickup?: PickupInfo;
}

export const FRANGO_PRICE = 50;
export const DEBITO_ACRESCIMO = 1;
export const CREDITO_ACRESCIMO = 2.5;

export function calcItemPrice(basePrice: number, payment: PaymentMethod): number {
  if (payment === "debito") return basePrice + DEBITO_ACRESCIMO;
  if (payment === "credito") return basePrice + CREDITO_ACRESCIMO;
  return basePrice;
}

export function calcTotal(quantity: number, payment: PaymentMethod, deliveryFee = 0): number {
  return calcItemPrice(FRANGO_PRICE, payment) * quantity + deliveryFee;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
