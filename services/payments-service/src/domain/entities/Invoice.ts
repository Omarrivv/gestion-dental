import { AggregateRoot, Guard } from '@dental/shared-kernel';
import { Money } from '../value-objects/Money';
import { Payment } from './Payment';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: Money;
}

export interface InvoiceProps {
  organizationId: string;
  branchId: string;
  patientId: string;
  appointmentId?: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  discountCents: number;
  currency: string;
  dueDate?: Date;
  notes?: string;
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

export class Invoice extends AggregateRoot {
  private props: InvoiceProps;

  private constructor(props: InvoiceProps, id?: string) {
    super(id);
    this.props = props;
  }

  static create(
    props: Omit<InvoiceProps, 'status' | 'payments' | 'createdAt' | 'updatedAt'>,
    id?: string,
  ): Invoice {
    Guard.againstEmpty(props.organizationId, 'Invoice.organizationId');
    Guard.againstEmpty(props.branchId, 'Invoice.branchId');
    Guard.againstEmpty(props.patientId, 'Invoice.patientId');

    if (props.lineItems.length === 0) {
      throw new Error('Invoice must have at least one line item');
    }

    const now = new Date();
    return new Invoice(
      {
        ...props,
        status: InvoiceStatus.OPEN,
        payments: [],
        createdAt: now,
        updatedAt: now,
      },
      id,
    );
  }

  static reconstitute(props: InvoiceProps, id: string): Invoice {
    return new Invoice(props, id);
  }

  // ── Business logic ────────────────────────────────────────────────────────
  applyPayment(payment: Payment): void {
    if (this.props.status === InvoiceStatus.PAID || this.props.status === InvoiceStatus.CANCELLED) {
      throw new Error(`Cannot apply payment to invoice with status ${this.props.status}`);
    }
    if (payment.amountCents <= 0) {
      throw new Error('Payment amount must be positive');
    }
    if (payment.amountCents > this.balanceDueCents) {
      throw new Error(
        `Payment ${payment.amountCents} exceeds balance due ${this.balanceDueCents}`,
      );
    }

    this.props.payments.push(payment);
    this.props.updatedAt = new Date();

    if (this.balanceDueCents === 0) {
      this.props.status = InvoiceStatus.PAID;
    }
  }

  cancel(reason?: string): void {
    if (this.props.status === InvoiceStatus.PAID) {
      throw new Error('Cannot cancel a paid invoice');
    }
    this.props.status = InvoiceStatus.CANCELLED;
    this.props.notes = reason;
    this.props.updatedAt = new Date();
  }

  markOverdue(): void {
    if (this.props.status === InvoiceStatus.OPEN) {
      this.props.status = InvoiceStatus.OVERDUE;
      this.props.updatedAt = new Date();
    }
  }

  // ── Computed properties ────────────────────────────────────────────────────
  get subtotalCents(): number {
    return this.props.lineItems.reduce(
      (sum, item) => sum + item.unitPrice.amountCents * item.quantity,
      0,
    );
  }

  get totalCents(): number {
    return Math.max(0, this.subtotalCents - this.props.discountCents);
  }

  get paidCents(): number {
    return this.props.payments.reduce((sum, p) => sum + p.amountCents, 0);
  }

  get balanceDueCents(): number {
    return this.totalCents - this.paidCents;
  }

  get status(): InvoiceStatus { return this.props.status; }
  get organizationId(): string { return this.props.organizationId; }
  get branchId(): string { return this.props.branchId; }
  get patientId(): string { return this.props.patientId; }
  get appointmentId(): string | undefined { return this.props.appointmentId; }
  get lineItems(): InvoiceLineItem[] { return [...this.props.lineItems]; }
  get payments(): Payment[] { return [...this.props.payments]; }
  get currency(): string { return this.props.currency; }
  get dueDate(): Date | undefined { return this.props.dueDate; }
}
