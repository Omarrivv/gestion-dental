/**
 * ValueObject — immutable, identity-less.
 * Two value objects with the same properties are equal.
 */
export abstract class ValueObject<T extends Record<string, unknown>> {
  protected readonly props: Readonly<T>;

  constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<T>): boolean {
    if (!(other instanceof ValueObject)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  toString(): string {
    return JSON.stringify(this.props);
  }
}
