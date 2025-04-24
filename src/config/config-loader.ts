import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { ServerConfig, ServerConfigSchema } from "../types/config.types";
import dotenv from "dotenv";

/**
 * Configuration loader that merges config from multiple sources:
 * - Default config (from schema defaults)
 * - Config file (JSON)
 * - Environment variables
 */
export class ConfigLoader {
  /**
   * Load configuration from file
   * @param configPath Path to the configuration file
   * @returns Loaded configuration
   */
  static async loadConfig(configPath?: string): Promise<ServerConfig> {
    // Load environment variables
    dotenv.config();

    // Start with default config from schema
    let config = ServerConfigSchema.parse({});

    // If a config path is specified, load and merge it
    if (configPath) {
      try {
        const configExists = await fs
          .stat(configPath)
          .then(() => true)
          .catch(() => false);

        if (configExists) {
          const fileContent = await fs.readFile(configPath, "utf-8");
          const fileConfig = JSON.parse(fileContent);
          config = this.mergeConfig(config, fileConfig);
        } else {
          console.warn(
            `Config file not found at ${configPath}, using defaults`
          );
        }
      } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error);
      }
    }

    // Override with environment variables
    config = this.applyEnvironmentVariables(config);

    // Validate the final config
    return ServerConfigSchema.parse(config);
  }

  /**
   * Merge config objects
   * @param base Base configuration
   * @param override Override configuration
   * @returns Merged configuration
   */
  private static mergeConfig(
    base: ServerConfig,
    override: Record<string, any>
  ): ServerConfig {
    // Merge the configs, validating against the schema
    return ServerConfigSchema.parse({
      ...base,
      ...override,
      processManager: {
        ...base.processManager,
        ...(override.processManager || {}),
      },
      plugins: {
        ...base.plugins,
        ...(override.plugins || {}),
        claudeCode: {
          ...base.plugins.claudeCode,
          ...(override.plugins?.claudeCode || {}),
        },
        git: {
          ...base.plugins.git,
          ...(override.plugins?.git || {}),
        },
        npm: {
          ...base.plugins.npm,
          ...(override.plugins?.npm || {}),
        },
      },
    });
  }

  /**
   * Apply environment variables to the configuration
   * @param config Base configuration
   * @returns Configuration with environment variables applied
   */
  private static applyEnvironmentVariables(config: ServerConfig): ServerConfig {
    const updatedConfig = { ...config };

    // Server configuration
    if (process.env.PORT) {
      updatedConfig.port = parseInt(process.env.PORT, 10);
    }
    if (process.env.HOST) {
      updatedConfig.host = process.env.HOST;
    }

    // Process manager configuration
    if (process.env.MAX_PROCESSES) {
      updatedConfig.processManager.maxProcesses = parseInt(
        process.env.MAX_PROCESSES,
        10
      );
    }

    // Claude Code plugin configuration
    if (process.env.CLAUDE_API_KEY) {
      updatedConfig.plugins.claudeCode.apiKey = process.env.CLAUDE_API_KEY;
    }
    if (process.env.CLAUDE_MODEL) {
      updatedConfig.plugins.claudeCode.defaultModel = process.env.CLAUDE_MODEL;
    }

    // More environment variable mappings can be added here

    return updatedConfig;
  }
}
