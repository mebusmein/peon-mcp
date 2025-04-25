import type { Config } from "../../types/config.js";
import { ConfigSchema } from "../../schemas/index.js";
import { set } from "../utils/object-utils.js";

interface CliParserOptions {
  /**
   * The command line arguments to parse
   * Default: process.argv.slice(2)
   */
  args?: string[];

  /**
   * Prefix for arguments, default is "--"
   */
  prefix?: string;
}

/**
 * Parse command line arguments into a configuration object
 */
export class CliParser {
  private args: string[];
  private prefix: string;

  constructor(options: CliParserOptions = {}) {
    this.args = options.args || process.argv.slice(2);
    this.prefix = options.prefix || "--";
  }

  /**
   * Parse command line arguments into a partial configuration object
   */
  public parse(): Partial<Config> {
    const config: Partial<Config> = {};

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      // Skip arguments that don't start with the prefix
      if (!arg.startsWith(this.prefix)) continue;

      // Extract key and value
      const keyValue = arg.substring(this.prefix.length);
      const equalIndex = keyValue.indexOf("=");

      let key: string;
      let value: string | undefined;

      if (equalIndex !== -1) {
        // Format: --key=value
        key = keyValue.substring(0, equalIndex);
        value = keyValue.substring(equalIndex + 1);
      } else {
        // Format: --key value
        key = keyValue;

        // Check if the next argument is a value (doesn't start with prefix)
        const nextArg = this.args[i + 1];
        if (nextArg && !nextArg.startsWith(this.prefix)) {
          value = nextArg;
          i++; // Skip the next argument since we've consumed it
        } else {
          // Boolean flag (--flag without value)
          value = "true";
        }
      }

      // Convert the value to the appropriate type
      const typedValue = this.convertValue(key, value);

      // Set the value in the config object using dot notation
      set(config, key, typedValue);
    }

    return config;
  }

  /**
   * Convert string value to the appropriate type based on schema
   */
  private convertValue(key: string, value: string): any {
    // Handle boolean flags
    if (value === "true") return true;
    if (value === "false") return false;

    // Handle numbers
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

    // Default to string
    return value;
  }
}
