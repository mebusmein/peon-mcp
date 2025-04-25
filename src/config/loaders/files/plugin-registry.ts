import fs from "fs/promises";
import path from "path";
import type { Config } from "../../types/config.js";
import { deepMerge } from "../utils/deep-merge.js";

interface PluginRegistryOptions {
  /**
   * Base directory for plugin configs
   * Default: "./plugins"
   */
  pluginsDir?: string;

  /**
   * File name pattern
   * Default: "config.json"
   */
  configFileName?: string;

  /**
   * Environment for environment-specific configs
   */
  environment?: string;
}

/**
 * Load and manage plugin configurations
 */
export class PluginRegistry {
  private options: Required<PluginRegistryOptions>;

  constructor(options: PluginRegistryOptions = {}) {
    this.options = {
      pluginsDir: options.pluginsDir || path.join(process.cwd(), "plugins"),
      configFileName: options.configFileName || "config.json",
      environment: options.environment || process.env.NODE_ENV || "development",
    };
  }

  /**
   * Load all plugin configurations
   */
  public async loadAll(): Promise<Partial<Config>> {
    const config: Partial<Config> = {
      plugins: {},
    };

    try {
      // Check if plugins directory exists
      await fs.access(this.options.pluginsDir);

      // Get all plugin directories
      const entries = await fs.readdir(this.options.pluginsDir, {
        withFileTypes: true,
      });
      const pluginDirs = entries.filter((entry) => entry.isDirectory());

      // Load config for each plugin
      for (const dir of pluginDirs) {
        const pluginName = dir.name;
        const pluginConfig = await this.loadPluginConfig(pluginName);

        if (pluginConfig) {
          // Add to plugins section
          config.plugins![pluginName] = pluginConfig;
        }
      }
    } catch (error) {
      const isNotFound = (error as NodeJS.ErrnoException).code === "ENOENT";

      if (!isNotFound) {
        console.warn(`Error loading plugin configurations:`, error);
      }
    }

    return config;
  }

  /**
   * Load configuration for a specific plugin
   */
  public async loadPluginConfig(pluginName: string): Promise<any> {
    const pluginDir = path.join(this.options.pluginsDir, pluginName);

    // Define files to load in order of precedence
    const files = [
      // Base config
      path.join(pluginDir, this.options.configFileName),
      // Environment-specific config
      path.join(pluginDir, `config.${this.options.environment}.json`),
      // Local overrides
      path.join(pluginDir, `config.local.json`),
    ];

    // Load and merge all configurations
    let pluginConfig = {};

    for (const filePath of files) {
      try {
        // Check if file exists
        await fs.access(filePath);

        // Read and parse file
        const content = await fs.readFile(filePath, "utf-8");
        const config = JSON.parse(content);

        // Merge with existing config
        pluginConfig = deepMerge(pluginConfig, config);
      } catch (error) {
        // Ignore file not found errors
        const isNotFound = (error as NodeJS.ErrnoException).code === "ENOENT";
        if (!isNotFound) {
          console.warn(`Error loading plugin config ${filePath}:`, error);
        }
      }
    }

    return pluginConfig;
  }
}
