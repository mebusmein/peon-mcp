import { ConfigManager } from "./loaders/manager/index.js";
import type { Config } from "./types/config.js";

let configManager: ConfigManager | null = null;

/**
 * Initialize the configuration manager
 * @param options Options for the config manager
 * @returns The configuration manager instance
 */
export function initConfig(
  options: {
    baseDir?: string;
    fileName?: string;
    environment?: string;
    pluginsDir?: string;
    envPrefix?: string;
    dotenvPath?: string;
    showHelpOnFlag?: boolean;
  } = {}
): ConfigManager {
  configManager = new ConfigManager(options);
  return configManager;
}

/**
 * Load configuration
 * @returns Promise that resolves to the loaded configuration
 * @throws Error if configuration fails to load
 */
export async function loadConfig(): Promise<Config> {
  if (!configManager) {
    configManager = new ConfigManager();
  }

  return configManager.load();
}

/**
 * Get the current configuration
 * @returns The current configuration
 * @throws Error if configuration not loaded
 */
export function getConfig(): Config {
  if (!configManager) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }

  return configManager.getConfig();
}

/**
 * Reload configuration
 * @returns Promise that resolves to the reloaded configuration
 * @throws Error if configuration fails to reload
 */
export async function reloadConfig(): Promise<Config> {
  if (!configManager) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }

  return configManager.reload();
}

/**
 * Get the configuration manager instance
 * @returns The configuration manager
 * @throws Error if configuration not initialized
 */
export function getConfigManager(): ConfigManager {
  if (!configManager) {
    throw new Error(
      "Configuration not initialized. Call initConfig() or loadConfig() first."
    );
  }

  return configManager;
}

// Export types and schemas
export * from "./types/config.js";
export * from "./schemas/index.js";

// Export loaders
export * from "./loaders/manager/index.js";
export * from "./loaders/cli/index.js";
export * from "./loaders/env/index.js";
export * from "./loaders/files/index.js";
