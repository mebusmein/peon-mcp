import { z } from "zod";
import type { FastMCP, Tool } from "fastmcp";

// Base plugin configuration schema
export const BasePluginConfigSchema = z.object({
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

export interface SessionContext extends Record<string, unknown> {
  id: string;
}

export type BasePluginConfig = z.infer<typeof BasePluginConfigSchema>;

// Plugin interface that all plugins must implement
export interface Plugin {
  name: string;
  description: string;
  initialize(mcp: FastMCP<SessionContext>): Promise<void>;
  getTools(): Tool<SessionContext, any>[];
  shutdown(): Promise<void>;
}

// Plugin config with process manager
export interface PluginConfigWithContext {
  [key: string]: any;
}

// Plugin constructor type
export type PluginConstructor = new (config: PluginConfigWithContext) => Plugin;

// Plugin definition for registration
export interface PluginDefinition {
  name: string;
  pluginClass: PluginConstructor;
  configKey?: string; // Optional key to locate config in the server config
}
