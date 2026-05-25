import { Entity } from '@dental/shared-kernel';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export interface PaymentProps {
  invoiceId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  paidAt: Date;
  notes?: string;
}

export class Payment extends Entity {
  private props: PaymentProps;

  private constructor(props: PaymentProps, id?: string) {
    super(id);
    this.props = props;
  }

  static create(props: Omit<PaymentProps, 'paidAt'>, id?: string): Payment {
    return new Payment({ ...props, paidAt: new Date() }, id);
  }

  static reconstitute(props: PaymentProps, id: string): Payment {
    return new Payment(props, id);
  }

  get invoiceId(): string { return this.props.invoiceId; }
  get amountCents(): number { return this.props.amountCents; }
  get method(): PaymentMethod { return this.props.method; }
  get reference(): string | undefined { return this.props.reference; }
  get paidAt(): Date { return this.props.paidAt; }
}
