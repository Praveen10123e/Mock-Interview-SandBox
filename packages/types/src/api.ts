import { PaginationMeta } from './pagination';

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, any>;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
  };
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
