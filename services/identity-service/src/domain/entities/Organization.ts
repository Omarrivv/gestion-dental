// ─── Domain Entity: Organization (Tenant) ─────────────────────────────────────
// This is the root aggregate for the tenant hierarchy.
// Every data operation that crosses the tenant boundary must
// go through this aggregate's invariants.

import { AggregateRoot, Guard } from '@dental/shared-kernel';
import { OrganizationCreatedDomainEvent } from '../events/OrganizationCreated';
import { BranchCreatedDomainEvent } from '../events/BranchCreated';

export enum SubscriptionPlan {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export interface OrganizationProps {
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  status: OrganizationStatus;
  logoUrl?: string;
  primaryColor?: string;
  trialEndsAt?: Date;
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationProps {
  name: string;
  slug: string;
  plan?: SubscriptionPlan;
  ownerEmail: string;
}

export class Organization extends AggregateRoot {
  private props: OrganizationProps;

  private constructor(props: OrganizationProps, id?: string) {
    super(id);
    this.props = props;
  }

  // ── Factory ────────────────────────────────────────────────────────────────
  static create(createProps: CreateOrganizationProps, id?: string): Organization {
    Guard.againstEmpty(createProps.name, 'Organization.name');
    Guard.againstEmpty(createProps.slug, 'Organization.slug');
    Guard.isValidEmail(createProps.ownerEmail, 'Organization.ownerEmail');

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(createProps.slug)) {
      throw new Error('Organization slug must be kebab-case (e.g. "dental-omar-sv")');
    }

    const now = new Date();
    const org = new Organization(
      {
        name: createProps.name,
        slug: createProps.slug,
        plan: createProps.plan ?? SubscriptionPlan.STARTER,
        status: OrganizationStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      },
      id,
    );

    org.addDomainEvent(
      new OrganizationCreatedDomainEvent({
        organizationId: org.id,
        name: org.props.name,
        plan: org.props.plan,
        ownerEmail: createProps.ownerEmail,
      }),
    );

    return org;
  }

  static reconstitute(props: OrganizationProps, id: string): Organization {
    return new Organization(props, id);
  }

  // ── Behavior ──────────────────────────────────────────────────────────────
  suspend(): void {
    if (this.props.status === OrganizationStatus.CANCELLED) {
      throw new Error('Cannot suspend a cancelled organization');
    }
    this.props.status = OrganizationStatus.SUSPENDED;
    this.props.updatedAt = new Date();
  }

  reactivate(): void {
    this.props.status = OrganizationStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  upgradePlan(plan: SubscriptionPlan): void {
    this.props.plan = plan;
    this.props.updatedAt = new Date();
  }

  assignSubscription(subscriptionId: string): void {
    Guard.againstEmpty(subscriptionId, 'subscriptionId');
    this.props.subscriptionId = subscriptionId;
    this.props.updatedAt = new Date();
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get plan(): SubscriptionPlan { return this.props.plan; }
  get status(): OrganizationStatus { return this.props.status; }
  get isActive(): boolean { return this.props.status === OrganizationStatus.ACTIVE; }
  get logoUrl(): string | undefined { return this.props.logoUrl; }
  get primaryColor(): string | undefined { return this.props.primaryColor; }
  get createdAt(): Date { return this.props.createdAt; }
}
