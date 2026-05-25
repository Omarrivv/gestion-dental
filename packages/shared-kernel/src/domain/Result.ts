/**
 * Result<T, E> — Explicit error handling without exceptions.
 * Forces callers to handle both success and failure paths.
 * Prefer this over throwing domain exceptions for expected failures.
 */
export class Result<T, E = string> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value: T | undefined,
    private readonly _error: E | undefined,
  ) {}

  static ok<T, E = string>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  static fail<T, E = string>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot access value on a failed Result');
    }
    return this._value as T;
  }

  get error(): E {
    if (this._isSuccess) {
      throw new Error('Cannot access error on a successful Result');
    }
    return this._error as E;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.ok<U, E>(fn(this._value as T));
    }
    return Result.fail<U, E>(this._error as E);
  }
}

/**
 * Combine multiple Results — fails fast on first error.
 */
export function combine<T, E = string>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isFailure) return Result.fail<T[], E>(result.error);
    values.push(result.value);
  }
  return Result.ok<T[], E>(values);
}
