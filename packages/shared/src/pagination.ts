import { PaginationParams, PaginationMeta } from '@nm/types';
import { DEFAULT_CONFIG } from '@nm/constants';

export class PaginationHelper {
  static getLimitAndOffset(params: PaginationParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit =
      params.limit && params.limit > 0 && params.limit <= DEFAULT_CONFIG.MAX_PAGINATION_LIMIT
        ? params.limit
        : DEFAULT_CONFIG.PAGINATION_LIMIT;

    const offset = (page - 1) * limit;

    return { limit, offset, page };
  }

  static buildMeta(
    totalItems: number,
    page: number,
    limit: number,
    itemCount: number,
  ): PaginationMeta {
    return {
      totalItems,
      itemCount,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  }
}
