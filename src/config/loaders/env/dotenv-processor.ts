import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import type { Config } from "../../types/config.js";
import { EnvLoader } from "./env-loader.js";

interface DotenvOptions {
  /**
   * Path to the .env file
   * Default: ".env"
   */
  path?: string;

  /**
   * Path to environment-specific .env file
   * Format: ".env.{environment}"
   */
  environment?: string;

  /**
   * Options for the environment loader
   */
  envOptions?: {
    prefix?: string;
    separator?: string;
    transformKeys?: boolean;
  };
}

/**
 * Load configuration from .env files
 */
export class DotenvProcessor {
  private options: DotenvOptions;

  constructor(options: DotenvOptions = {}) {
    this.options = {
      path: options.path || ".env",
      environment: options.environment,
      envOptions: options.envOptions || {},
    };
  }

  /**
   * Load configuration from .env files
   */
  public async load(): Promise<Partial<Config>> {
    // Define files to load in order of precedence
    const files = [
      this.options.path,
      // Environment-specific file has higher precedence
      this.options.environment
        ? `${this.options.path}.${this.options.environment}`
        : null,
      // Local overrides have highest precedence
      `${this.options.path}.local`,
    ].filter(Boolean) as string[];

    // Load all files and merge environment variables
    const env = { ...process.env };

    for (const file of files) {
      try {
        await this.loadEnvFile(file, env);
      } catch (error) {
        // Ignore file not found errors
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn(`Error loading .env file ${file}:`, error);
        }
      }
    }

    // Process environment variables into config object
    const loader = new EnvLoader({
      ...this.options.envOptions,
      env,
    });

    return loader.load();
  }

  /**
   * Load a single .env file
   */
  private async loadEnvFile(
    filePath: string,
    env: NodeJS.ProcessEnv
  ): Promise<void> {
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, skip
      return;
    }

    // Read file content
    const content = await fs.readFile(filePath, "utf-8");

    // Parse .env file content
    const parsed = dotenv.parse(content);

    // Merge with existing environment
    Object.assign(env, parsed);
  }
}
