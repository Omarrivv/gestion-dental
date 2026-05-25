import { DomainEvent } from '@dental/shared-kernel';

interface Payload {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
}

export class UserCreatedDomainEvent extends DomainEvent {
  readonly eventName = 'identity.user.created' as const;
  readonly userId: string;
  readonly organizationId: string;
  readonly email: string;
  readonly role: string;

  constructor(payload: Payload) {
    super();
    this.userId = payload.userId;
    this.organizationId = payload.organizationId;
    this.email = payload.email;
    this.role = payload.role;
  }
}
