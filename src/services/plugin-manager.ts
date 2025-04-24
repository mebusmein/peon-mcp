import { FastMCP } from "fastmcp";
import {
  Plugin,
  PluginConstructor,
  SessionContext,
  PluginDefinition,
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
      console.log(`Initializing plugin: ${pluginName}`);
      await plugin.initialize(this.mcp);

      // Register plugin tools with MCP
      const tools = plugin.getTools();
      console.log(
        `Plugin "${pluginName}" has ${tools.length} tools to register`
      );

      for (const tool of tools) {
        // Register the tool using addTool with proper structure
        try {
          this.mcp.addTool({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
            execute: async (args: any, context: any) => {
              // Call the plugin tool function with the arguments
              return await tool.execute(args, context);
            },
          });
        } catch (error) {
          console.error(`Failed to register tool ${tool.name}:`, error);
        }
      }

      return plugin;
    } catch (error) {
      console.error(`Failed to register plugin "${pluginName}":`, error);
      throw error;
    }
  }

  /**
   * Load plugins from plugin definitions
   * @param pluginDefinitions Array of plugin definitions
   */
  async loadPlugins(pluginDefinitions: PluginDefinition[]): Promise<void> {
    console.log(`Loading ${pluginDefinitions.length} plugins...`);

    for (const definition of pluginDefinitions) {
      try {
        // Get plugin config from server config or use empty object
        const configKey = definition.configKey || definition.name;
        const pluginConfig =
          (this.config.plugins as Record<string, any>)[configKey] || {};

        // Skip disabled plugins
        if (pluginConfig.enabled === false) {
          console.log(`Skipping disabled plugin: ${definition.name}`);
          continue;
        }

        // Add process manager to plugin config
        const fullConfig = {
          ...pluginConfig,
          processManager: this.processManager,
        };

        // Register the plugin
        await this.registerPlugin(
          definition.name,
          definition.pluginClass,
          fullConfig
        );
      } catch (error) {
        console.error(`Failed to load plugin ${definition.name}:`, error);
      }
    }

    console.log(`Successfully loaded ${this.plugins.size} plugins`);
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
