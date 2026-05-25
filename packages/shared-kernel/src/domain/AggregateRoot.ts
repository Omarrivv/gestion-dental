import { Entity } from './Entity';
import { DomainEvent } from './DomainEvent';

/**
 * AggregateRoot is the transactional boundary of a domain concept.
 * It owns a collection of uncommitted domain events that will be
 * dispatched after the unit of work commits.
 */
export abstract class AggregateRoot<TId extends string = string> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
