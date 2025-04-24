import { z } from "zod";
import { BasePluginConfigSchema } from "./plugin.types";

// Process Manager configuration schema
export const ProcessManagerConfigSchema = z.object({
  maxProcesses: z.number().positive().default(10),
  checkIntervalMs: z.number().positive().default(5000),
});

// Claude Code plugin configuration schema
export const ClaudeCodePluginConfigSchema = BasePluginConfigSchema.extend({
  apiKey: z.string().optional(),
  defaultModel: z.string().default("claude-3-sonnet-20240229"),
  timeoutMs: z.number().positive().default(60000),
});

// Git plugin configuration schema
export const GitPluginConfigSchema = BasePluginConfigSchema.extend({
  allowedCommands: z
    .array(z.string())
    .default(["status", "commit", "push", "pull", "branch", "checkout"]),
  branchTemplates: z.record(z.string(), z.string()).optional(),
  defaultBranchTemplate: z.string().optional(),
});

// NPM plugin configuration schema
export const NpmPluginConfigSchema = BasePluginConfigSchema.extend({
  mode: z.enum(["whitelist", "blacklist"]).default("whitelist"),
  allowedCommands: z.array(z.string()).default(["install", "run", "test"]),
  blockedCommands: z.array(z.string()).default(["publish", "config"]),
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

// Server configuration schema
export const ServerConfigSchema = z.object({
  port: z.number().positive().default(3000),
  host: z.string().default("localhost"),
  processManager: ProcessManagerConfigSchema.default({}),
  plugins: z
    .object({
      claudeCode: ClaudeCodePluginConfigSchema.default({}),
      git: GitPluginConfigSchema.default({}),
      npm: NpmPluginConfigSchema.default({}),
    })
    .default({}),
});

export type ProcessManagerConfig = z.infer<typeof ProcessManagerConfigSchema>;
export type ClaudeCodePluginConfig = z.infer<
  typeof ClaudeCodePluginConfigSchema
>;
export type GitPluginConfig = z.infer<typeof GitPluginConfigSchema>;
export type NpmPluginConfig = z.infer<typeof NpmPluginConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
