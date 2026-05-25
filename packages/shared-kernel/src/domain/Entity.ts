import { randomUUID } from 'crypto';

/**
 * Base class for all domain Entities.
 * Identity is compared by ID, not by reference.
 */
export abstract class Entity<TId extends string | number = string> {
  protected readonly _id: TId;

  constructor(id?: TId) {
    this._id = id ?? (randomUUID() as TId);
  }

  get id(): TId {
    return this._id;
  }

  equals(entity: Entity<TId>): boolean {
    if (!(entity instanceof Entity)) return false;
    return this._id === entity._id;
  }
}
