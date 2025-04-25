import { z } from "zod";

export const BasePluginSchema = z
  .object({
    enabled: z
      .boolean()
      .default(true)
      .describe("Whether the plugin is enabled"),
    description: z.string().optional().describe("Plugin description"),
  })
  .describe("Base plugin configuration");

export const PluginsSchema = z
  .record(z.unknown())
  .describe("Plugin-specific configurations");

export type BasePluginConfig = z.infer<typeof BasePluginSchema>;
export type PluginsConfig = z.infer<typeof PluginsSchema>;
