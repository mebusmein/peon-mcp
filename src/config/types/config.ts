import type { Config } from "../schemas/index.js";

export type {
  Config,
  CoreConfig,
  LoggingConfig,
  ProcessManagerConfig,
  PluginsConfig,
  BasePluginConfig,
} from "../schemas/index.js";

export const CONFIG_SOURCES = {
  DEFAULT: "default",
  FILE: "file",
  ENV: "env",
  CLI: "cli",
} as const;

export type ConfigSource = (typeof CONFIG_SOURCES)[keyof typeof CONFIG_SOURCES];

export interface ConfigWithMetadata {
  data: Config;
  sources: {
    [key: string]: {
      value: any;
      source: ConfigSource;
      timestamp: number;
    };
  };
}
