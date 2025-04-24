import { FastMCP, Tool, ToolParameters } from "fastmcp";
import {
  Plugin,
  PluginConstructor,
  SessionContext,
} from "../types/plugin.types";
import { ServerConfig } from "../types/config.types";
import { ProcessManager } from "./process-manager";
import path from "path";

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private mcp: FastMCP<SessionContext>;
  private config: ServerConfig;
  private processManager: ProcessManager;

  constructor(
    mcp: FastMCP<SessionContext>,
    config: ServerConfig,
    processManager: ProcessManager
  ) {
    this.mcp = mcp;
    this.config = config;
    this.processManager = processManager;
  }

  /**
   * Register a plugin with the manager
   * @param pluginName Name of the plugin
   * @param PluginClass Plugin class constructor
   * @param pluginConfig Configuration for the plugin
   */
  async registerPlugin(
    pluginName: string,
    PluginClass: PluginConstructor,
    pluginConfig: any
  ): Promise<Plugin> {
    if (this.plugins.has(pluginName)) {
      throw new Error(`Plugin "${pluginName}" is already registered`);
    }

    try {
      // Instantiate the plugin with its config
      const plugin = new PluginClass(pluginConfig);

      // Store the plugin
      this.plugins.set(pluginName, plugin);

      // Initialize the plugin
      await plugin.initialize(this.mcp);

      // Register plugin tools with MCP
      const tools = plugin.getTools();
      for (const tool of tools) {
        this.mcp.addTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          execute: tool.execute,
        } as Tool<SessionContext>);
      }

      console.log(
        `Plugin "${pluginName}" successfully registered with ${tools.length} tools`
      );

      return plugin;
    } catch (error) {
      console.error(`Failed to register plugin "${pluginName}":`, error);
      throw error;
    }
  }

  /**
   * Load all plugins from the plugins directory
   */
  async loadPlugins(): Promise<void> {
    console.log("Loading plugins...");

    const pluginsConfig = this.config.plugins;

    // Load claude-code plugin if enabled
    if (pluginsConfig.claudeCode.enabled) {
      try {
        const { ClaudeCodePlugin } = await import(
          "../plugins/claude-code/claude-code-plugin"
        );
        await this.registerPlugin("claudeCode", ClaudeCodePlugin, {
          ...pluginsConfig.claudeCode,
          processManager: this.processManager,
        });
        console.log("Claude Code plugin loaded successfully");
      } catch (error) {
        console.error("Failed to load Claude Code plugin:", error);
      }
    }

    // Load git plugin if enabled
    if (pluginsConfig.git.enabled) {
      try {
        const { GitPlugin } = await import("../plugins/git/git-plugin");
        await this.registerPlugin("git", GitPlugin, {
          ...pluginsConfig.git,
          processManager: this.processManager,
        });
        console.log("Git plugin loaded successfully");
      } catch (error) {
        console.error("Failed to load Git plugin:", error);
      }
    }

    // Load npm plugin if enabled
    if (pluginsConfig.npm.enabled) {
      try {
        const { NpmPlugin } = await import("../plugins/npm/npm-plugin");
        await this.registerPlugin("npm", NpmPlugin, {
          ...pluginsConfig.npm,
          processManager: this.processManager,
        });
        console.log("NPM plugin loaded successfully");
      } catch (error) {
        console.error("Failed to load NPM plugin:", error);
      }
    }
  }

  /**
   * Get a loaded plugin by name
   * @param name Plugin name
   * @returns The plugin instance or undefined if not found
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   * @returns Array of all registered plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Shutdown all plugins
   */
  async shutdownPlugins(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      try {
        await plugin.shutdown();
      } catch (error) {
        console.error(`Error shutting down plugin "${plugin.name}":`, error);
      }
    }
    this.plugins.clear();
  }
}
