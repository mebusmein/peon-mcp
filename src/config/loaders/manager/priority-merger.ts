import type {
  Config,
  ConfigSource,
  ConfigWithMetadata} from "../../types/config.js";
import {
  CONFIG_SOURCES,
} from "../../types/config.js";
import { ConfigSchema } from "../../schemas/index.js";
import { deepMerge } from "../utils/deep-merge.js";

export class PriorityMerger {
  private configs: {
    source: ConfigSource;
    data: Partial<Config>;
  }[] = [];

  /**
   * Add a configuration from a specific source
   * @param data Configuration data
   * @param source Source of the configuration
   */
  public addConfig(data: Partial<Config>, source: ConfigSource): void {
    this.configs.push({
      source,
      data,
    });
  }

  /**
   * Merge all configurations according to precedence:
   * 1. CLI Arguments (highest precedence)
   * 2. Environment Variables
   * 3. Config Files
   * 4. Default Values (lowest precedence)
   */
  public merge(): ConfigWithMetadata {
    // Sort configs by priority
    const sortedConfigs = this.sortByPriority(this.configs);

    // Start with an empty config
    let mergedConfig = {} as Config;

    // Track metadata about each setting
    const sources: ConfigWithMetadata["sources"] = {};

    // Merge configs in order of priority
    for (const { source, data } of sortedConfigs) {
      // Deep merge the data
      mergedConfig = deepMerge(mergedConfig, data) as Config;

      // Track the source of each property
      this.trackSources(sources, data, source);
    }

    // Apply defaults from schema for any undefined properties
    const finalConfig = this.applyDefaults(mergedConfig);

    return {
      data: finalConfig,
      sources,
    };
  }

  /**
   * Sort configurations by their priority
   */
  private sortByPriority(
    configs: { source: ConfigSource; data: Partial<Config> }[]
  ) {
    const priority: { [key in ConfigSource]: number } = {
      [CONFIG_SOURCES.CLI]: 4,
      [CONFIG_SOURCES.ENV]: 3,
      [CONFIG_SOURCES.FILE]: 2,
      [CONFIG_SOURCES.DEFAULT]: 1,
    };

    return [...configs].sort((a, b) => priority[b.source] - priority[a.source]);
  }

  /**
   * Track the source of each configuration property
   */
  private trackSources(
    sources: ConfigWithMetadata["sources"],
    data: Partial<Config>,
    source: ConfigSource
  ) {
    const traverse = (obj: any, path: string = "") => {
      if (!obj || typeof obj !== "object") return;

      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;

        if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          traverse(value, currentPath);
        } else {
          sources[currentPath] = {
            value,
            source,
            timestamp: Date.now(),
          };
        }
      });
    };

    traverse(data);
  }

  /**
   * Apply default values from the schema to missing properties
   */
  private applyDefaults(config: Partial<Config>): Config {
    // Use Zod's parse which applies defaults defined in the schema
    return ConfigSchema.parse(config);
  }
}
