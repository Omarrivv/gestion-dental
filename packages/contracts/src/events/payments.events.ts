// ─── Payments Events ─────────────────────────────────────────────────────────
export interface InvoiceCreatedEvent {
  readonly eventName: 'payments.invoice.created';
  readonly invoiceId: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly patientId: string;
  readonly appointmentId: string | null;
  readonly totalAmountCents: number;
  readonly currency: string;
  readonly occurredAt: string;
}

export interface PaymentRegisteredEvent {
  readonly eventName: 'payments.payment.registered';
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly organizationId: string;
  readonly amountCents: number;
  readonly method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  readonly occurredAt: string;
}

export interface InvoiceFullyPaidEvent {
  readonly eventName: 'payments.invoice.fully_paid';
  readonly invoiceId: string;
  readonly organizationId: string;
  readonly patientId: string;
  readonly occurredAt: string;
}
