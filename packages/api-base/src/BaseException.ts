import { BaseError } from '@nm/errors';

export abstract class BaseException extends BaseError {
  // Can be extended by services to create domain-specific base exceptions
}
