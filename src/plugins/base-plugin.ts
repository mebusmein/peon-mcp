import { FastMCP } from "fastmcp";
import {
  BasePluginConfig,
  BasePluginConfigSchema,
  SessionContext,
} from "../types/plugin.types";
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
    // Extract the base plugin config with defaults
    this.config = {
      enabled: true,
      ...config,
      description: config.description,
    };

    // Validate with schema
    try {
      this.config = BasePluginConfigSchema.parse(this.config);
    } catch (error) {
      console.warn(
        `Invalid base configuration for plugin. Using defaults.`,
        error
      );
      this.config = BasePluginConfigSchema.parse({});
    }
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
   * Check if the plugin is enabled
   */
  get isEnabled(): boolean {
    return this.config.enabled !== false;
  }

  /**
   * Initialize the plugin with the MCP server
   * @param mcp The MCP server instance
   */
  async initialize(mcp: FastMCP<SessionContext>): Promise<void> {
    // Override in subclasses to perform initialization
    if (!this.isEnabled) {
      console.log(`Plugin ${this.name} is disabled, skipping initialization`);
      return;
    }
  }

  /**
   * Get the tools provided by this plugin
   * @returns Array of tool descriptions
   */
  getTools(): ToolDescription[] {
    if (!this.isEnabled) {
      return [];
    }
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
