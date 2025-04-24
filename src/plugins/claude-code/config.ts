import { z } from "zod";
import { BasePluginConfigSchema } from "../../types/plugin.types";

// Claude Code plugin configuration schema
export const ClaudeCodePluginConfigSchema = BasePluginConfigSchema.extend({
  apiKey: z.string().optional(),
  defaultModel: z.string().default("claude-3-sonnet-20240229"),
  timeoutMs: z.number().positive().default(60000),
});

export type ClaudeCodePluginConfig = z.infer<
  typeof ClaudeCodePluginConfigSchema
>;

/**
 * Validate and process the Claude Code plugin configuration
 * @param config Raw configuration object
 * @returns Validated configuration
 */
export function validateConfig(config: unknown): ClaudeCodePluginConfig {
  try {
    return ClaudeCodePluginConfigSchema.parse(config);
  } catch (error) {
    console.error("Invalid Claude Code plugin configuration:", error);
    // Return default configuration if validation fails
    return ClaudeCodePluginConfigSchema.parse({});
  }
}
