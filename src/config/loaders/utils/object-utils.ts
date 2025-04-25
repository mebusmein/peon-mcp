/**
 * Set a value in an object using a dot-notation path
 * @param obj Object to modify
 * @param path Path in dot notation (e.g., "a.b.c")
 * @param value Value to set
 */
export function set(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split(".");
  let current = obj;

  // Navigate to the last but one key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Create empty object if it doesn't exist
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }

    current = current[key];
  }

  // Set the value on the last key
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * Get a value from an object using a dot-notation path
 * @param obj Object to get value from
 * @param path Path in dot notation (e.g., "a.b.c")
 * @param defaultValue Default value if path doesn't exist
 */
export function get(
  obj: Record<string, any>,
  path: string,
  defaultValue?: any
): any {
  const keys = path.split(".");
  let current = obj;

  // Navigate through the path
  for (const key of keys) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object"
    ) {
      return defaultValue;
    }

    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Check if an object has a property at the given path
 * @param obj Object to check
 * @param path Path in dot notation (e.g., "a.b.c")
 */
export function has(obj: Record<string, any>, path: string): boolean {
  return get(obj, path) !== undefined;
}

/**
 * Flatten an object into key-value pairs with dot notation
 * @param obj Object to flatten
 * @param prefix Prefix for keys (used in recursion)
 */
export function flatten(
  obj: Record<string, any>,
  prefix: string = ""
): Record<string, any> {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (
      obj[key] !== null &&
      typeof obj[key] === "object" &&
      !Array.isArray(obj[key])
    ) {
      // Recursively flatten nested objects
      Object.assign(acc, flatten(obj[key], prefixedKey));
    } else {
      // Set the value directly for non-objects
      acc[prefixedKey] = obj[key];
    }

    return acc;
  }, {} as Record<string, any>);
}
