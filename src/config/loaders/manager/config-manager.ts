import type { Config, ConfigWithMetadata } from "../../types/config.js";
import { CONFIG_SOURCES } from "../../types/config.js";
import { PriorityMerger } from "./priority-merger.js";
import { ZodValidator } from "./zod-validator.js";
import {
  loadFromCommandLine,
  isHelpRequested,
  printHelp,
} from "../cli/index.js";
import { loadFromEnvironment } from "../env/index.js";
import { loadFromFiles } from "../files/index.js";
import { EventEmitter } from "events";

interface ConfigManagerOptions {
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
   * Environment for environment-specific configs
   * Default: process.env.NODE_ENV || "development"
   */
  environment?: string;

  /**
   * Directory for plugin configs
   * Default: "./plugins"
   */
  pluginsDir?: string;

  /**
   * Prefix for environment variables
   * Default: "PEON_"
   */
  envPrefix?: string;

  /**
   * Path to .env file
   * Default: ".env"
   */
  dotenvPath?: string;

  /**
   * Whether to check for --help flag
   * Default: true
   */
  showHelpOnFlag?: boolean;
}

// Configuration change event types
interface ConfigChangeEvent {
  path: string;
  oldValue: any;
  newValue: any;
  source: string;
}

export declare interface IConfigManager {
  on(event: "change", listener: (changes: ConfigChangeEvent[]) => void): this;
  on(event: "reload", listener: (config: Config) => void): this;
  on(event: "error", listener: (error: Error) => void): this;

  emit(event: "change", changes: ConfigChangeEvent[]): boolean;
  emit(event: "reload", config: Config): boolean;
  emit(event: "error", error: Error): boolean;
}

/**
 * Configuration manager that loads, validates, and provides access to configuration
 */
export class ConfigManager extends EventEmitter {
  private options: Required<ConfigManagerOptions>;
  private configData: ConfigWithMetadata | null = null;

  constructor(options: ConfigManagerOptions = {}) {
    super();

    this.options = {
      baseDir: options.baseDir || process.cwd(),
      fileName: options.fileName || "config",
      environment: options.environment || process.env.NODE_ENV || "development",
      pluginsDir: options.pluginsDir || "./plugins",
      envPrefix: options.envPrefix || "PEON_",
      dotenvPath: options.dotenvPath || ".env",
      showHelpOnFlag: options.showHelpOnFlag !== false,
    };
  }

  /**
   * Load configuration from all sources and validate
   */
  public async load(): Promise<Config> {
    try {
      // Check for help flag
      if (this.options.showHelpOnFlag && isHelpRequested()) {
        printHelp();
        process.exit(0);
      }

      // Create merger
      const merger = new PriorityMerger();

      // Load from files (lowest priority)
      const fileConfig = await loadFromFiles({
        baseDir: this.options.baseDir,
        fileName: this.options.fileName,
        environment: this.options.environment,
        pluginsDir: this.options.pluginsDir,
      });
      merger.addConfig(fileConfig, CONFIG_SOURCES.FILE);

      // Load from environment variables
      const envConfig = await loadFromEnvironment({
        environment: this.options.environment,
        envPrefix: this.options.envPrefix,
        dotenvPath: this.options.dotenvPath,
      });
      merger.addConfig(envConfig, CONFIG_SOURCES.ENV);

      // Load from command line arguments (highest priority)
      const cliConfig = loadFromCommandLine();
      merger.addConfig(cliConfig, CONFIG_SOURCES.CLI);

      // Merge all configurations
      this.configData = merger.merge();

      // Validate the merged configuration
      const validatedConfig = ZodValidator.validate(this.configData.data);

      // Store the validated configuration
      this.configData.data = validatedConfig;

      // Emit reload event
      this.emit("reload", validatedConfig);

      return validatedConfig;
    } catch (error) {
      // Emit error event
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Reload configuration from all sources
   */
  public async reload(): Promise<Config> {
    // Store old configuration for comparison
    const oldConfig = this.configData?.data;

    // Load new configuration
    const newConfig = await this.load();

    // Check for changes if old config exists
    if (oldConfig) {
      const changes = this.detectChanges(oldConfig, newConfig);

      if (changes.length > 0) {
        this.emit("change", changes);
      }
    }

    return newConfig;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Config {
    if (!this.configData) {
      throw new Error("Configuration not loaded. Call load() first.");
    }

    return this.configData.data;
  }

  /**
   * Get metadata about configuration sources
   */
  public getMetadata(): Record<
    string,
    { value: any; source: string; timestamp: number }
  > {
    if (!this.configData) {
      throw new Error("Configuration not loaded. Call load() first.");
    }

    return this.configData.sources;
  }

  /**
   * Get configuration source for a specific path
   */
  public getSourceForPath(path: string): string | undefined {
    if (!this.configData) {
      throw new Error("Configuration not loaded. Call load() first.");
    }

    return this.configData.sources[path]?.source;
  }

  /**
   * Detect changes between old and new configurations
   */
  private detectChanges(
    oldConfig: Config,
    newConfig: Config
  ): ConfigChangeEvent[] {
    const changes: ConfigChangeEvent[] = [];
    const metadata = this.configData?.sources || {};

    // Helper function to traverse objects and detect changes
    const traverse = (oldObj: any, newObj: any, path: string = "") => {
      // Get all keys from both objects
      const allKeys = new Set([
        ...Object.keys(oldObj || {}),
        ...Object.keys(newObj || {}),
      ]);

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        const oldValue = oldObj?.[key];
        const newValue = newObj?.[key];

        // Check for undefined or different types
        if (
          oldValue === undefined ||
          newValue === undefined ||
          typeof oldValue !== typeof newValue
        ) {
          changes.push({
            path: currentPath,
            oldValue,
            newValue,
            source: metadata[currentPath]?.source || "unknown",
          });
        }
        // Compare objects recursively
        else if (
          typeof oldValue === "object" &&
          !Array.isArray(oldValue) &&
          oldValue !== null
        ) {
          traverse(oldValue, newValue, currentPath);
        }
        // Compare primitive values
        else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            path: currentPath,
            oldValue,
            newValue,
            source: metadata[currentPath]?.source || "unknown",
          });
        }
      }
    };

    // Start traversal
    traverse(oldConfig, newConfig);

    return changes;
  }
}
