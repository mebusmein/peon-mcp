import { z } from "zod";
import { BasePluginConfigSchema } from "../../types/plugin.types.js";

// Git plugin configuration schema
export const GitPluginConfigSchema = BasePluginConfigSchema.extend({
  allowedCommands: z
    .array(z.string())
    .default([
      "status",
      "commit",
      "push",
      "pull",
      "branch",
      "checkout",
      "log",
      "diff",
    ]),
  branchTemplates: z.record(z.string(), z.string()).optional(),
  defaultBranchTemplate: z.string().optional(),
});

export type GitPluginConfig = z.infer<typeof GitPluginConfigSchema>;

/**
 * Validate and process the Git plugin configuration
 * @param config Raw configuration object
 * @returns Validated configuration
 */
export function validateConfig(config: unknown): GitPluginConfig {
  try {
    return GitPluginConfigSchema.parse(config);
  } catch (error) {
    console.error("Invalid Git plugin configuration:", error);
    // Return default configuration if validation fails
    return GitPluginConfigSchema.parse({});
  }
}
