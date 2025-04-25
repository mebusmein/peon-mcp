/**
 * Deep merge two objects
 * @param target Target object
 * @param source Source object
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const output = { ...target } as T;

  if (!source || typeof source !== "object") {
    return output;
  }

  Object.keys(source).forEach((key) => {
    const k = key as keyof T;
    const targetValue = output[k];
    const sourceValue = source[k];

    if (
      targetValue &&
      sourceValue &&
      typeof targetValue === "object" &&
      typeof sourceValue === "object" &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      // If both values are objects, merge them recursively
      output[k] = deepMerge(targetValue, sourceValue) as any;
    } else if (sourceValue !== undefined) {
      // Otherwise overwrite with source value if defined
      output[k] = sourceValue as any;
    }
  });

  return output;
}
