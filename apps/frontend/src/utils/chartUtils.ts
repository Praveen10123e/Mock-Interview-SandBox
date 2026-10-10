/**
 * Utility to normalize chart data across different timeframes to prevent visual jumps.
 * It ensures the chart always renders with a consistent number of data points
 * and properly aligns the domain for Recharts.
 */
export function normalizeChartData<T extends { date?: string; timestamp?: number }>(
  data: T[], 
  points: number = 7, 
  fillValue: Partial<T> = {}
): T[] {
  if (!data || data.length === 0) {
    // Return empty array of correct size with placeholder values
    return Array.from({ length: points }).map((_, i) => ({
      ...fillValue,
      _normalized: true,
      index: i
    })) as unknown as T[];
  }

  // If we have exactly the right amount, return it
  if (data.length === points) {
    return data;
  }

  // If we have too much data, slice the most recent
  if (data.length > points) {
    return data.slice(-points);
  }

  // If we have too little data, pad the beginning to avoid jumping left-to-right
  const paddingSize = points - data.length;
  const padding = Array.from({ length: paddingSize }).map((_, i) => ({
    ...fillValue,
    _normalized: true,
    isPadding: true,
    index: i
  }));

  return [...padding, ...data] as unknown as T[];
}

/**
 * Get stable Y-axis domain based on data max to prevent axis jumping
 * Returns [0, max + padding]
 */
export function getStableYDomain(maxValue: number, minSteps: number = 5): [number, number] {
  if (maxValue <= 0) return [0, minSteps];
  
  // Calculate next nice number (e.g. 87 -> 100, 12 -> 15)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const normalized = maxValue / magnitude;
  
  let step;
  if (normalized <= 1.5) step = 1.5;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 2.5) step = 2.5;
  else if (normalized <= 5) step = 5;
  else step = 10;
  
  const niceMax = step * magnitude;
  
  return [0, Math.max(niceMax, minSteps)];
}
