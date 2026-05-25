import { AggregateRoot, Guard } from '@dental/shared-kernel';
import { UserCreatedDomainEvent } from '../events/UserCreated';
import { Email } from '../value-objects/Email';
import { Role, UserRole } from '../value-objects/Role';

export interface UserProps {
  organizationId: string;
  email: Email;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date;
  branchIds: string[]; // branches this user has access to
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  organizationId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  branchIds?: string[];
}

export class User extends AggregateRoot {
  private props: UserProps;

  private constructor(props: UserProps, id?: string) {
    super(id);
    this.props = props;
  }

  static create(createProps: CreateUserProps, id?: string): User {
    Guard.againstEmpty(createProps.organizationId, 'User.organizationId');
    Guard.againstEmpty(createProps.firstName, 'User.firstName');
    Guard.againstEmpty(createProps.lastName, 'User.lastName');
    Guard.againstEmpty(createProps.passwordHash, 'User.passwordHash');

    const email = Email.create(createProps.email);
    const role = Role.create(createProps.role);
    const now = new Date();

    const user = new User(
      {
        organizationId: createProps.organizationId,
        email,
        passwordHash: createProps.passwordHash,
        firstName: createProps.firstName,
        lastName: createProps.lastName,
        phone: createProps.phone,
        role,
        isActive: true,
        branchIds: createProps.branchIds ?? [],
        createdAt: now,
        updatedAt: now,
      },
      id,
    );

    user.addDomainEvent(
      new UserCreatedDomainEvent({
        userId: user.id,
        organizationId: createProps.organizationId,
        email: createProps.email,
        role: createProps.role,
      }),
    );

    return user;
  }

  static reconstitute(props: UserProps, id: string): User {
    return new User(props, id);
  }

  // ── Behavior ──────────────────────────────────────────────────────────────
  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  grantBranchAccess(branchId: string): void {
    Guard.againstEmpty(branchId, 'branchId');
    if (!this.props.branchIds.includes(branchId)) {
      this.props.branchIds = [...this.props.branchIds, branchId];
      this.props.updatedAt = new Date();
    }
  }

  revokeBranchAccess(branchId: string): void {
    this.props.branchIds = this.props.branchIds.filter((id) => id !== branchId);
    this.props.updatedAt = new Date();
  }

  hasAccessToBranch(branchId: string): boolean {
    if (this.props.role.value === UserRole.ORG_ADMIN || this.props.role.value === UserRole.SUPERADMIN) {
      return true; // org admins have implicit access to all branches
    }
    return this.props.branchIds.includes(branchId);
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get organizationId(): string { return this.props.organizationId; }
  get email(): Email { return this.props.email; }
  get emailValue(): string { return this.props.email.value; }
  get passwordHash(): string { return this.props.passwordHash; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get phone(): string | undefined { return this.props.phone; }
  get role(): Role { return this.props.role; }
  get roleValue(): UserRole { return this.props.role.value; }
  get isActive(): boolean { return this.props.isActive; }
  get branchIds(): string[] { return [...this.props.branchIds]; }
  get lastLoginAt(): Date | undefined { return this.props.lastLoginAt; }
}
