import fs from "fs/promises";
import path from "path";
import type { Config } from "../../types/config.js";
import { deepMerge } from "../utils/deep-merge.js";

// Supported file formats
type FileFormat = "json" | "js";

interface FileLoaderOptions {
  /**
   * Base directory for config files
   * Default: current working directory
   */
  baseDir?: string;

  /**
   * Config file name without extension
   * Default: "config"
   */
  fileName?: string;

  /**
   * Environment to load configuration for
   * Format: "config.{environment}.json"
   */
  environment?: string;

  /**
   * Supported file formats in order of preference
   * Default: ["json", "js"]
   */
  formats?: FileFormat[];
}

/**
 * Load configuration from files
 */
export class FileLoader {
  private options: Required<FileLoaderOptions>;

  constructor(options: FileLoaderOptions = {}) {
    this.options = {
      baseDir: options.baseDir || process.cwd(),
      fileName: options.fileName || "config",
      environment: options.environment || process.env.NODE_ENV || "development",
      formats: options.formats || ["json", "js"],
    };
  }

  /**
   * Load configuration from files
   */
  public async load(): Promise<Partial<Config>> {
    // Define files to load in order of precedence
    const files = [
      // Base config has lowest precedence
      { name: this.options.fileName, required: false },
      // Environment-specific config has higher precedence
      {
        name: `${this.options.fileName}.${this.options.environment}`,
        required: false,
      },
      // Local overrides have highest precedence
      { name: `${this.options.fileName}.local`, required: false },
    ];

    // Load and merge all configurations
    let mergedConfig = {} as Partial<Config>;

    for (const file of files) {
      const config = await this.loadConfigFile(file.name, file.required);
      if (config) {
        mergedConfig = deepMerge(mergedConfig, config);
      }
    }

    return mergedConfig;
  }

  /**
   * Load a specific config file
   */
  private async loadConfigFile(
    baseName: string,
    required: boolean
  ): Promise<Partial<Config> | null> {
    // Try each supported format
    for (const format of this.options.formats) {
      const filePath = path.join(this.options.baseDir, `${baseName}.${format}`);

      try {
        // Check if file exists
        await fs.access(filePath);

        // Load the file based on its format
        let config: Partial<Config>;

        if (format === "json") {
          const content = await fs.readFile(filePath, "utf-8");
          config = JSON.parse(content);
        } else if (format === "js") {
          // Import JavaScript/TypeScript module
          const module = await import(filePath);
          config = module.default || module;
        } else {
          throw new Error(`Unsupported file format: ${format}`);
        }

        // Return the loaded config
        return config;
      } catch (error) {
        const isNotFound = (error as NodeJS.ErrnoException).code === "ENOENT";

        if (required && isNotFound) {
          throw new Error(`Required config file not found: ${filePath}`);
        } else if (!isNotFound) {
          console.warn(`Error loading config file ${filePath}:`, error);
        }

        // File doesn't exist or error occurred, try next format
      }
    }

    // No valid config file found
    return null;
  }
}
