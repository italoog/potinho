export interface PaymentLineItem {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity: number;
}

export interface CreatePaymentSessionInput {
  orderId: string;
  customerEmail: string;
  items: PaymentLineItem[];
  shippingCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentSession {
  redirectUrl: string;
  providerPaymentId: string;
}
