/**
 * Domain errors.
 *
 * `NotFoundError` is what an authorization denial on a cross-tenant object
 * becomes at the boundary (ADR-0003): the caller must not be able to distinguish
 * "exists but forbidden" from "does not exist", because that difference confirms
 * the existence of another tenant's data.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(objectType: string) {
    super(`${objectType} not found`, 'not_found');
  }
}

export class ForbiddenError extends DomainError {
  constructor(reason: string) {
    super(reason, 'forbidden');
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    readonly issues: readonly { path: string; message: string }[] = [],
  ) {
    super(message, 'validation_failed');
  }
}
