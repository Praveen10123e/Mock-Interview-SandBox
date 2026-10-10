/**
 * Central normalization helpers to ensure safe rendering of API-derived fields in React.
 * Protects the UI from crashing with "Objects are not valid as a React child" when
 * the API returns a DTO object (e.g. { id, name }) instead of a primitive string.
 */

export const getDisplayName = (value: unknown, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  
  if (typeof value === 'object' && !Array.isArray(value)) {
    // If object has a 'name' property, use it (e.g. Category, Topic, Language DTOs)
    if ('name' in value && typeof (value as { name: unknown }).name === 'string') {
      return (value as { name: string }).name;
    }
    // If it has a 'title' property
    if ('title' in value && typeof (value as { title: unknown }).title === 'string') {
      return (value as { title: string }).title;
    }
  }

  return fallback;
};

export const getTagNames = (tags: unknown[] | unknown): string[] => {
  if (!tags) return [];
  if (!Array.isArray(tags)) return [getDisplayName(tags)];
  
  return tags
    .map(tag => getDisplayName(tag))
    .filter(Boolean); // removes empty strings
};

/**
 * Safely extracts a meaningful string from any unknown error object/value.
 * Prevents React "[object Object]" rendering crashes.
 */
export const extractErrorMessage = (err: unknown, fallback: string = 'An unknown error occurred'): string => {
  if (err === null || err === undefined) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err === 'number' || typeof err === 'boolean') return String(err);
  
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object') {
    // If it has a specific message property
    const errObj = err as Record<string, unknown>;
    
    // Axios response data shape or similar nested API error shapes
    if (errObj.response && typeof errObj.response === 'object') {
       const res = errObj.response as any;
       if (res.data) {
         return extractErrorMessage(res.data, fallback);
       }
    }
    
    if (errObj.message && typeof errObj.message === 'string') return errObj.message;
    if (errObj.error && typeof errObj.error === 'string') return errObj.error;
    
    if (errObj.error && typeof errObj.error === 'object') {
       return extractErrorMessage(errObj.error, fallback);
    }
    
    // Validation errors array
    if (Array.isArray(errObj.errors)) {
       try {
         return JSON.stringify(errObj.errors, null, 2);
       } catch (e) {
         // ignore
       }
    }
    
    // Zod / Judge0 shapes
    if (errObj.description && typeof errObj.description === 'string') return errObj.description;
    if (errObj.compile_output && typeof errObj.compile_output === 'string') return errObj.compile_output;
    if (errObj.stderr && typeof errObj.stderr === 'string') return errObj.stderr;
    
    // Finally, attempt stringify if safe
    try {
      return JSON.stringify(err, null, 2);
    } catch (e) {
      return fallback;
    }
  }

  return fallback;
};
