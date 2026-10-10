export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  UNAUTHORIZED: 'You must be logged in to access this resource.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource could not be found.',
  VALIDATION_ERROR: 'Invalid data provided.',
  CONFLICT: 'A conflict occurred with the current state of the resource.',
} as const;

export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully.',
  UPDATED: 'Resource updated successfully.',
  DELETED: 'Resource deleted successfully.',
  FETCHED: 'Resource fetched successfully.',
} as const;
