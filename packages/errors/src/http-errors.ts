import { BaseError } from './base-error';
import { HTTP_STATUS, ERROR_MESSAGES } from '@nm/constants';

export class ValidationError extends BaseError {
  constructor(message: string = ERROR_MESSAGES.VALIDATION_ERROR, details?: any[]) {
    super('ValidationError', message, HTTP_STATUS.BAD_REQUEST, true, details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super('AuthenticationError', message, HTTP_STATUS.UNAUTHORIZED, true);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = ERROR_MESSAGES.FORBIDDEN) {
    super('AuthorizationError', message, HTTP_STATUS.FORBIDDEN, true);
  }
}

export class ForbiddenError extends AuthorizationError {}

export class NotFoundError extends BaseError {
  constructor(message: string = ERROR_MESSAGES.NOT_FOUND) {
    super('NotFoundError', message, HTTP_STATUS.NOT_FOUND, true);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = ERROR_MESSAGES.CONFLICT) {
    super('ConflictError', message, HTTP_STATUS.CONFLICT, true);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string = 'Database operation failed') {
    super('DatabaseError', message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }
}

export class AIServiceError extends BaseError {
  constructor(message: string = 'AI service operation failed') {
    super('AIServiceError', message, HTTP_STATUS.BAD_GATEWAY, true);
  }
}

export class JudgeServiceError extends BaseError {
  constructor(message: string = 'Judge service operation failed') {
    super('JudgeServiceError', message, HTTP_STATUS.BAD_GATEWAY, true);
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string = ERROR_MESSAGES.INTERNAL_SERVER_ERROR) {
    super('InternalServerError', message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }
}
