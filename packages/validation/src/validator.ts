import { z } from 'zod';
import { ErrorFactory } from '@nm/errors';

export class Validator {
  static validate<T>(schema: z.Schema<T>, data: unknown): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      const details = result.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw ErrorFactory.validation('Validation failed', details);
    }

    return result.data;
  }
}
