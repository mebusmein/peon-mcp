import { FastMCP } from "fastmcp";
import { BasePluginConfig } from "../types/plugin.types";
import {
  Plugin,
  ToolDescription,
  PluginConfigWithProcessManager,
} from "../types/plugin.types";

/**
 * Abstract base class for all plugins
 * Provides common functionality and enforces the Plugin interface
 */
export abstract class BasePlugin implements Plugin {
  protected config: BasePluginConfig;
  protected tools: ToolDescription[] = [];

  constructor(config: PluginConfigWithProcessManager) {
    // Extract the base plugin config
    this.config = {
      enabled: config.enabled !== undefined ? config.enabled : true,
      description: config.description,
    };
  }

  /**
   * Get the name of the plugin
   */
  abstract get name(): string;

  /**
   * Get the description of the plugin
   */
  get description(): string {
    return this.config.description || `${this.name} plugin`;
  }

  /**
   * Initialize the plugin with the MCP server
   * @param mcp The MCP server instance
   */
  async initialize(mcp: FastMCP): Promise<void> {
    // Override in subclasses to perform initialization
  }

  /**
   * Get the tools provided by this plugin
   * @returns Array of tool descriptions
   */
  getTools(): ToolDescription[] {
    return this.tools;
  }

  /**
   * Add a tool to this plugin
   * @param tool Tool description to add
   */
  protected addTool(tool: ToolDescription): void {
    this.tools.push(tool);
  }

  /**
   * Shutdown the plugin
   */
  async shutdown(): Promise<void> {
    // Override in subclasses to perform cleanup
  }
}
