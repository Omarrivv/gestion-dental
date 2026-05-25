import { ValueObject, Guard } from '@dental/shared-kernel';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(raw: string): Email {
    Guard.againstEmpty(raw, 'Email');
    Guard.isValidEmail(raw.trim().toLowerCase(), 'Email');
    return new Email({ value: raw.trim().toLowerCase() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
