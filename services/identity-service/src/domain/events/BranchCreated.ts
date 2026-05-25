import { DomainEvent } from '@dental/shared-kernel';

interface Payload {
  branchId: string;
  organizationId: string;
  name: string;
  address: string;
}

export class BranchCreatedDomainEvent extends DomainEvent {
  readonly eventName = 'identity.branch.created' as const;
  readonly branchId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly address: string;

  constructor(payload: Payload) {
    super();
    this.branchId = payload.branchId;
    this.organizationId = payload.organizationId;
    this.name = payload.name;
    this.address = payload.address;
  }
}
