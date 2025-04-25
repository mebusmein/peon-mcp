import type { FastMCP } from "fastmcp";
import type {
  Plugin,
  PluginConstructor,
  SessionContext,
  PluginDefinition,
} from "../types/plugin.types.js";
import type { Config } from "../config/types/config.js";
import type { ProcessManager } from "./process-manager.js";
import path from "path";
import { logger } from "./logging/index.js";

// Create a logger for this service
const pluginLogger = logger.withPrefix("PluginManager");

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private mcp: FastMCP<SessionContext>;
  private config: Config;
  private processManager: ProcessManager;

  constructor(
    mcp: FastMCP<SessionContext>,
    config: Config,
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
      pluginLogger.debug("Initializing plugin %s", pluginName);
      await plugin.initialize(this.mcp);

      // Register plugin tools with MCP
      const tools = plugin.getTools();
      pluginLogger.debug(
        "Plugin %s has %d tools to register",
        pluginName,
        tools.length
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
          pluginLogger.error(
            "Failed to register tool %s: %s",
            tool.name,
            error
          );
        }
      }

      pluginLogger.info(
        "Plugin %s registered successfully with %d tools",
        pluginName,
        tools.length
      );
      return plugin;
    } catch (error) {
      pluginLogger.error(
        "Failed to initialize plugin %s: %s",
        pluginName,
        error
      );
      throw error;
    }
  }

  /**
   * Load plugins from plugin definitions
   * @param pluginDefinitions Array of plugin definitions
   */
  async loadPlugins(pluginDefinitions: PluginDefinition[]): Promise<void> {
    pluginLogger.info(
      "Initializing loading of %d plugins...",
      pluginDefinitions.length
    );

    for (const definition of pluginDefinitions) {
      try {
        // Get plugin config from server config or use empty object
        const configKey = definition.configKey || definition.name;
        const pluginConfig =
          (this.config.plugins as Record<string, any>)[configKey] || {};

        // Skip disabled plugins
        if (pluginConfig.enabled === false) {
          pluginLogger.info("Skipping disabled plugin: %s", definition.name);
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
        pluginLogger.error(
          "Failed to load plugin %s: %s",
          definition.name,
          error
        );
      }
    }

    pluginLogger.info("Successfully loaded %d plugins", this.plugins.size);
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
        pluginLogger.error(
          "Error shutting down plugin %s: %s",
          plugin.name,
          error
        );
      }
    }
    this.plugins.clear();
  }
}
