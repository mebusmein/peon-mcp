import type { Config } from "../../types/config.js";
import { EnvLoader } from "./env-loader.js";
import { DotenvProcessor } from "./dotenv-processor.js";

/**
 * Load configuration from environment variables and .env files
 * @param options Options for loading
 * @returns Partial configuration
 */
export async function loadFromEnvironment(
  options: {
    environment?: string;
    envPrefix?: string;
    envSeparator?: string;
    dotenvPath?: string;
  } = {}
): Promise<Partial<Config>> {
  // Load from .env files first
  const dotenvProcessor = new DotenvProcessor({
    path: options.dotenvPath || ".env",
    environment: options.environment,
    envOptions: {
      prefix: options.envPrefix || "PEON_",
      separator: options.envSeparator || "_",
      transformKeys: true,
    },
  });

  // Get environment variables from .env files
  await dotenvProcessor.load();

  // Then load directly from environment variables
  // (which will take precedence over .env files)
  const envLoader = new EnvLoader({
    prefix: options.envPrefix || "PEON_",
    separator: options.envSeparator || "_",
    transformKeys: true,
  });

  return envLoader.load();
}

export { EnvLoader, DotenvProcessor };
