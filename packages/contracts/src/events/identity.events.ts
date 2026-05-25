// ─── Identity / Tenant Events ──────────────────────────────────────────────
export interface OrganizationCreatedEvent {
  readonly eventName: 'identity.organization.created';
  readonly organizationId: string;
  readonly name: string;
  readonly plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  readonly ownerEmail: string;
  readonly occurredAt: string; // ISO-8601
}

export interface BranchCreatedEvent {
  readonly eventName: 'identity.branch.created';
  readonly branchId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly address: string;
  readonly occurredAt: string;
}

export interface UserCreatedEvent {
  readonly eventName: 'identity.user.created';
  readonly userId: string;
  readonly organizationId: string;
  readonly email: string;
  readonly role: string;
  readonly occurredAt: string;
}
