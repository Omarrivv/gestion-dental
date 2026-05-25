import { DomainEvent } from '@dental/shared-kernel';

interface Payload {
  organizationId: string;
  name: string;
  plan: string;
  ownerEmail: string;
}

export class OrganizationCreatedDomainEvent extends DomainEvent {
  readonly eventName = 'identity.organization.created' as const;
  readonly organizationId: string;
  readonly name: string;
  readonly plan: string;
  readonly ownerEmail: string;

  constructor(payload: Payload) {
    super();
    this.organizationId = payload.organizationId;
    this.name = payload.name;
    this.plan = payload.plan;
    this.ownerEmail = payload.ownerEmail;
  }
}
