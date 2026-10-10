import { ResponseBuilder } from '@nm/shared';
import { PaginationMeta } from '@nm/types';

export class BaseResponse {
  static success<T>(data: T, message?: string, meta?: PaginationMeta) {
    return ResponseBuilder.success(data, message, meta);
  }

  static error(code: string, message: string, details?: any[]) {
    return ResponseBuilder.error(code, message, details);
  }
}
