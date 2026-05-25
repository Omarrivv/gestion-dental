import { ValueObject } from '@dental/shared-kernel';

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}

// Permissions map — ordered from most to least privileged
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPERADMIN]: ['*'],
  [UserRole.ORG_ADMIN]: [
    'org:read', 'org:write',
    'branch:read', 'branch:write',
    'user:read', 'user:write',
    'patient:read', 'patient:write',
    'appointment:read', 'appointment:write',
    'clinical:read', 'clinical:write',
    'payment:read', 'payment:write',
    'report:read',
  ],
  [UserRole.BRANCH_ADMIN]: [
    'branch:read',
    'user:read',
    'patient:read', 'patient:write',
    'appointment:read', 'appointment:write',
    'clinical:read', 'clinical:write',
    'payment:read', 'payment:write',
    'report:read',
  ],
  [UserRole.DOCTOR]: [
    'patient:read',
    'appointment:read', 'appointment:write',
    'clinical:read', 'clinical:write',
  ],
  [UserRole.RECEPTIONIST]: [
    'patient:read', 'patient:write',
    'appointment:read', 'appointment:write',
    'payment:read', 'payment:write',
  ],
  [UserRole.PATIENT]: [
    'appointment:read',
    'clinical:read',
  ],
};

interface RoleProps {
  value: UserRole;
}

export class Role extends ValueObject<RoleProps> {
  private constructor(props: RoleProps) {
    super(props);
  }

  static create(role: UserRole): Role {
    if (!Object.values(UserRole).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    return new Role({ value: role });
  }

  get value(): UserRole {
    return this.props.value;
  }

  hasPermission(permission: string): boolean {
    const perms = ROLE_PERMISSIONS[this.props.value];
    return perms.includes('*') || perms.includes(permission);
  }

  get permissions(): string[] {
    return ROLE_PERMISSIONS[this.props.value];
  }
}
