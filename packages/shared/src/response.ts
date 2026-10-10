import { ApiResponse, SuccessResponse, ErrorResponse, PaginationMeta } from '@nm/types';

export class ResponseBuilder {
  static success<T>(
    data: T,
    message?: string,
    meta?: PaginationMeta | Record<string, any>,
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      ...(message && { message }),
      ...(meta && { meta }),
    };
  }

  static error(code: string, message: string, details?: any[]): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 && { details }),
      },
    };
  }
}
