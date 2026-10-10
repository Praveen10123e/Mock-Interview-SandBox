import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  DatabaseError,
  AIServiceError,
  JudgeServiceError,
} from './http-errors';

export class ErrorFactory {
  static validation(message?: string, details?: any[]) {
    return new ValidationError(message, details);
  }

  static unauthenticated(message?: string) {
    return new AuthenticationError(message);
  }

  static unauthorized(message?: string) {
    return new AuthorizationError(message);
  }

  static notFound(message?: string) {
    return new NotFoundError(message);
  }

  static conflict(message?: string) {
    return new ConflictError(message);
  }

  static internal(message?: string) {
    return new InternalServerError(message);
  }

  static database(message?: string) {
    return new DatabaseError(message);
  }

  static aiService(message?: string) {
    return new AIServiceError(message);
  }

  static judgeService(message?: string) {
    return new JudgeServiceError(message);
  }
}
