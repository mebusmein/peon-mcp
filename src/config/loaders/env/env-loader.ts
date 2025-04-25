import type { Config } from "../../types/config.js";
import { set } from "../utils/object-utils.js";

interface EnvLoaderOptions {
  /**
   * Prefix for environment variables
   * Default: "PEON_"
   */
  prefix?: string;

  /**
   * Separator for nested properties
   * Default: "_"
   */
  separator?: string;

  /**
   * Whether to transform keys to camelCase
   * Default: true
   */
  transformKeys?: boolean;

  /**
   * Environment variables to use
   * Default: process.env
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Load configuration from environment variables
 */
export class EnvLoader {
  private prefix: string;
  private separator: string;
  private transformKeys: boolean;
  private env: NodeJS.ProcessEnv;

  constructor(options: EnvLoaderOptions = {}) {
    this.prefix = options.prefix || "PEON_";
    this.separator = options.separator || "_";
    this.transformKeys = options.transformKeys !== false;
    this.env = options.env || process.env;
  }

  /**
   * Load configuration from environment variables
   */
  public load(): Partial<Config> {
    const config: Partial<Config> = {};

    // Process all environment variables
    Object.entries(this.env).forEach(([key, value]) => {
      // Skip environment variables without the prefix
      if (!key.startsWith(this.prefix)) return;

      // Remove prefix and convert to path
      const path = this.keyToPath(key.substring(this.prefix.length));

      // Set the value in the config object
      if (value !== undefined) {
        set(config, path, this.parseValue(value));
      }
    });

    return config;
  }

  /**
   * Convert environment variable key to config path
   * Example: DB_HOST -> db.host
   */
  private keyToPath(key: string): string {
    const parts = key.split(this.separator);

    if (this.transformKeys) {
      // Transform keys to camelCase
      return parts
        .map((part, index) => {
          const lower = part.toLowerCase();
          return index === 0 ? lower : this.capitalize(lower);
        })
        .join("");
    } else {
      // Convert to dot notation without transforming
      return parts.join(".");
    }
  }

  /**
   * Capitalize the first letter of a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Parse environment variable value to the appropriate type
   */
  private parseValue(value: string): any {
    // Detect boolean values
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    // Detect numeric values
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

    // Detect JSON values
    if (
      (value.startsWith("{") && value.endsWith("}")) ||
      (value.startsWith("[") && value.endsWith("]"))
    ) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // If parsing fails, return the string value
      }
    }

    // Default: return as string
    return value;
  }
}
