import type { Config } from "../../types/config.js";
import { FileLoader } from "./file-loader.js";
import { PluginRegistry } from "./plugin-registry.js";
import { deepMerge } from "../utils/deep-merge.js";

/**
 * Load configuration from files and plugin configs
 * @param options Options for loading
 * @returns Partial configuration
 */
export async function loadFromFiles(
  options: {
    baseDir?: string;
    fileName?: string;
    environment?: string;
    pluginsDir?: string;
  } = {}
): Promise<Partial<Config>> {
  // Load main configuration files
  const fileLoader = new FileLoader({
    baseDir: options.baseDir,
    fileName: options.fileName,
    environment: options.environment,
  });

  // Load plugin configurations
  const pluginRegistry = new PluginRegistry({
    pluginsDir: options.pluginsDir,
    environment: options.environment,
  });

  // Load both in parallel
  const [mainConfig, pluginConfigs] = await Promise.all([
    fileLoader.load(),
    pluginRegistry.loadAll(),
  ]);

  // Merge configurations
  return deepMerge(mainConfig, pluginConfigs);
}

export { FileLoader, PluginRegistry };
