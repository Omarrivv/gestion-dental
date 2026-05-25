// Represents the full patient record (shared across branches in same org)
import { AggregateRoot, Guard } from '@dental/shared-kernel';

export interface PatientProps {
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  bloodType?: string;
  allergies: string[];
  currentMeds: string[];
  notes?: string;
  portalEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Patient extends AggregateRoot {
  private props: PatientProps;

  private constructor(props: PatientProps, id?: string) {
    super(id);
    this.props = props;
  }

  static create(props: Omit<PatientProps, 'createdAt' | 'updatedAt' | 'portalEnabled'>, id?: string): Patient {
    Guard.againstEmpty(props.organizationId, 'Patient.organizationId');
    Guard.againstEmpty(props.firstName, 'Patient.firstName');
    Guard.againstEmpty(props.lastName, 'Patient.lastName');
    Guard.againstEmpty(props.phone, 'Patient.phone');

    const now = new Date();
    return new Patient({ ...props, portalEnabled: false, createdAt: now, updatedAt: now }, id);
  }

  static reconstitute(props: PatientProps, id: string): Patient {
    return new Patient(props, id);
  }

  update(fields: Partial<Pick<PatientProps, 'firstName' | 'lastName' | 'email' | 'phone' | 'address' | 'notes' | 'allergies' | 'currentMeds'>>): void {
    Object.assign(this.props, fields);
    this.props.updatedAt = new Date();
  }

  enablePortal(passHash: string): void {
    this.props.portalEnabled = true;
    this.props.updatedAt = new Date();
  }

  get organizationId(): string { return this.props.organizationId; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get email(): string | undefined { return this.props.email; }
  get phone(): string { return this.props.phone; }
  get bloodType(): string | undefined { return this.props.bloodType; }
  get allergies(): string[] { return [...this.props.allergies]; }
  get currentMeds(): string[] { return [...this.props.currentMeds]; }
  get portalEnabled(): boolean { return this.props.portalEnabled; }
}
