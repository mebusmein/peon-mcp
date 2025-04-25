import { z } from "zod";
import { CoreSchema } from "./core.schema.js";
import type { CoreConfig } from "./core.schema.js";
import { LoggingSchema } from "./logging.schema.js";
import type { LoggingConfig } from "./logging.schema.js";
import { ProcessManagerSchema } from "./process-manager.schema.js";
import type { ProcessManagerConfig } from "./process-manager.schema.js";
import { PluginsSchema } from "./plugins.schema.js";
import type {
  BasePluginConfig,
  BasePluginSchema,
  PluginsConfig,
} from "./plugins.schema.js";

const NonCoreSchema = z.object({
  logging: LoggingSchema,
  processManager: ProcessManagerSchema,
  plugins: PluginsSchema,
});

export const ConfigSchema = NonCoreSchema.merge(CoreSchema).describe(
  "Complete application configuration"
);

export type Config = z.infer<typeof ConfigSchema>;

export {
  CoreSchema,
  CoreConfig,
  LoggingSchema,
  LoggingConfig,
  ProcessManagerSchema,
  ProcessManagerConfig,
  PluginsSchema,
  PluginsConfig,
  BasePluginSchema,
  BasePluginConfig,
};
