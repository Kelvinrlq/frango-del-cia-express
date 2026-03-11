export interface CreatePixPaymentRequest {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cpf: string;
  total_amount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  order_type: "delivery" | "pickup";
  delivery_info?: Record<string, unknown>;
  notes?: string;
}

export interface CreatePixPaymentResponse {
  order_id: string;
  payment_id: string;
  mercadopago_payment_id: number;
  qr_code: string | null;
  qr_code_base64: string | null;
  pix_key: string | null;
  amount: number;
  expires_at: string;
  status: string;
}

export interface CheckPaymentStatusResponse {
  status: "pending" | "approved" | "rejected" | "cancelled";
  mercadopago_status: string;
  mercadopago_payment_id: string;
}
