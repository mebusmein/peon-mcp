import { z } from "zod";
import { BasePluginConfigSchema } from "../../types/plugin.types";

// NPM plugin configuration schema
export const NpmPluginConfigSchema = BasePluginConfigSchema.extend({
  mode: z.enum(["whitelist", "blacklist"]).default("whitelist"),
  allowedCommands: z
    .array(z.string())
    .default(["install", "run", "test", "list", "outdated", "update"]),
  blockedCommands: z
    .array(z.string())
    .default(["publish", "config", "access", "adduser", "login"]),
  commandConfig: z
    .record(
      z.string(),
      z.object({
        allowedArgs: z.array(z.string()).optional(),
        blockedArgs: z.array(z.string()).optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export type NpmPluginConfig = z.infer<typeof NpmPluginConfigSchema>;

/**
 * Validate and process the NPM plugin configuration
 * @param config Raw configuration object
 * @returns Validated configuration
 */
export function validateConfig(config: unknown): NpmPluginConfig {
  try {
    return NpmPluginConfigSchema.parse(config);
  } catch (error) {
    console.error("Invalid NPM plugin configuration:", error);
    // Return default configuration if validation fails
    return NpmPluginConfigSchema.parse({});
  }
}
