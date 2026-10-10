import { Validator } from '@nm/validation';
import { z } from 'zod';

export abstract class BaseValidator {
  protected validate<T>(schema: z.Schema<T>, data: unknown): T {
    return Validator.validate(schema, data);
  }
}
