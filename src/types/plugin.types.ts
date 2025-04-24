import { z } from "zod";
import { FastMCP, FastMCPSession, Tool, ToolParameters } from "fastmcp";
import { ProcessManager } from "../services/process-manager";

// Base plugin configuration schema
export const BasePluginConfigSchema = z.object({
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

export interface SessionContext extends Record<string, unknown> {
  id: string;
}

export type BasePluginConfig = z.infer<typeof BasePluginConfigSchema>;

// Tool description interface
export interface ToolDescription extends Tool<SessionContext> {}

// Plugin interface that all plugins must implement
export interface Plugin {
  name: string;
  description: string;
  initialize(mcp: FastMCP<SessionContext>): Promise<void>;
  getTools(): ToolDescription[];
  shutdown(): Promise<void>;
}

// Plugin config with process manager
export interface PluginConfigWithProcessManager {
  processManager: ProcessManager;
  [key: string]: any;
}

// Plugin constructor type
export type PluginConstructor = new (
  config: PluginConfigWithProcessManager
) => Plugin;
