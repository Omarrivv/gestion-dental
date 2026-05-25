/**
 * DomainEvent — something that happened in the domain.
 * Published after a successful aggregate state change.
 */
export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventId: string;
  abstract readonly eventName: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = crypto.randomUUID();
  }
}

export interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
