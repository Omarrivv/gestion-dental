/**
 * Guard clauses for domain validation.
 * Used inside Value Objects and Entities to enforce invariants.
 */
export class Guard {
  static againstNullOrUndefined(value: unknown, name: string): void {
    if (value === null || value === undefined) {
      throw new Error(`[Guard] "${name}" must not be null or undefined`);
    }
  }

  static againstEmpty(value: string, name: string): void {
    Guard.againstNullOrUndefined(value, name);
    if (value.trim().length === 0) {
      throw new Error(`[Guard] "${name}" must not be empty`);
    }
  }

  static againstNegative(value: number, name: string): void {
    if (value < 0) {
      throw new Error(`[Guard] "${name}" must not be negative. Got: ${value}`);
    }
  }

  static againstOutOfRange(value: number, min: number, max: number, name: string): void {
    if (value < min || value > max) {
      throw new Error(`[Guard] "${name}" must be between ${min} and ${max}. Got: ${value}`);
    }
  }

  static isValidEmail(value: string, name: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error(`[Guard] "${name}" is not a valid email address: ${value}`);
    }
  }

  static isValidUUID(value: string, name: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`[Guard] "${name}" is not a valid UUID: ${value}`);
    }
  }
}
