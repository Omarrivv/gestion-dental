import { Entity, Guard } from '@dental/shared-kernel';
import { BranchCreatedDomainEvent } from '../events/BranchCreated';

export interface BranchProps {
  organizationId: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBranchProps {
  organizationId: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  timezone?: string;
}

export class Branch extends Entity {
  private props: BranchProps;

  private constructor(props: BranchProps, id?: string) {
    super(id);
    this.props = props;
  }

  static create(createProps: CreateBranchProps, id?: string): Branch {
    Guard.againstEmpty(createProps.organizationId, 'Branch.organizationId');
    Guard.againstEmpty(createProps.name, 'Branch.name');
    Guard.againstEmpty(createProps.address, 'Branch.address');
    Guard.againstEmpty(createProps.city, 'Branch.city');

    const now = new Date();
    return new Branch(
      {
        organizationId: createProps.organizationId,
        name: createProps.name,
        address: createProps.address,
        city: createProps.city,
        phone: createProps.phone,
        email: createProps.email,
        timezone: createProps.timezone ?? 'America/El_Salvador',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      id,
    );
  }

  static reconstitute(props: BranchProps, id: string): Branch {
    return new Branch(props, id);
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  get organizationId(): string { return this.props.organizationId; }
  get name(): string { return this.props.name; }
  get address(): string { return this.props.address; }
  get city(): string { return this.props.city; }
  get phone(): string | undefined { return this.props.phone; }
  get email(): string | undefined { return this.props.email; }
  get timezone(): string { return this.props.timezone; }
  get isActive(): boolean { return this.props.isActive; }
}
