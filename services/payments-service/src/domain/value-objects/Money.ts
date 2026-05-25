import { ValueObject, Guard } from '@dental/shared-kernel';

interface MoneyProps {
  amountCents: number; // stored as integer minor units (e.g. 1000 = $10.00)
  currency: string;    // ISO 4217 (USD, CRC, etc.)
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amountCents: number, currency = 'USD'): Money {
    Guard.againstNegative(amountCents, 'Money.amountCents');
    if (currency.length !== 3) {
      throw new Error(`Invalid ISO 4217 currency code: ${currency}`);
    }
    return new Money({ amountCents, currency });
  }

  static fromDecimal(amount: number, currency = 'USD'): Money {
    return Money.create(Math.round(amount * 100), currency);
  }

  add(other: Money): Money {
    if (other.props.currency !== this.props.currency) {
      throw new Error('Cannot add Money with different currencies');
    }
    return new Money({ amountCents: this.props.amountCents + other.props.amountCents, currency: this.props.currency });
  }

  subtract(other: Money): Money {
    if (other.props.currency !== this.props.currency) {
      throw new Error('Cannot subtract Money with different currencies');
    }
    return new Money({ amountCents: this.props.amountCents - other.props.amountCents, currency: this.props.currency });
  }

  get amountCents(): number { return this.props.amountCents; }
  get currency(): string { return this.props.currency; }
  get amount(): number { return this.props.amountCents / 100; }

  format(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.props.currency,
    }).format(this.amount);
  }
}
