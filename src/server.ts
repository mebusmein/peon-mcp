import type { ServerOptions } from "fastmcp";
import { FastMCP } from "fastmcp";
import { PluginManager } from "./services/plugin-manager.js";
import type { PluginDefinition } from "./types/plugin.types.js";
import type { SessionContext } from "./types/plugin.types.js";
import { logger } from "./services/logging/index.js";
import { ClaudeCodePlugin } from "./plugins/claude-code/claude-code-plugin.js";
import type { Config } from "./config/types/config.js";

export class Server {
  private mcp: FastMCP<SessionContext>;
  private pluginManager: PluginManager;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.mcp = new FastMCP<SessionContext>({
      name: "peon-mcp",
      version: "1.0.0",
      authenticate: async () => {
        const id = "testing";
        return { id };
      },
    });

    this.pluginManager = new PluginManager(this.mcp, this.config);
  }

  public async start() {
    const serverLogger = logger.withPrefix("Server");

    // Load and register plugins
    const availablePlugins: PluginDefinition[] = [
      {
        name: "claudeCode",
        pluginClass: ClaudeCodePlugin,
        configKey: "claudeCode",
      },
    ];
    await this.pluginManager.loadPlugins(availablePlugins);

    // Configure transport based on the specified type or config
    const transportType =
      this.config.transportType || this.config.transportType;

    if (transportType === "stdio") {
      await this.mcp.start({
        transportType: "stdio",
      });
      serverLogger.info("MCP server running in stdio mode");
    } else {
      await this.mcp.start({
        transportType: "sse",
        sse: {
          endpoint: "/mcp",
          port: this.config.port,
        },
      });
      serverLogger.info(
        `MCP server running at http://${this.config.host}:${this.config.port}/mcp`
      );
    }
  }

  public async shutdown() {
    const serverLogger = logger.withPrefix("Server");
    serverLogger.info("Shutting down server...");

    try {
      // Shutdown plugins
      await this.pluginManager.shutdownPlugins();

      // Close MCP server
      if (typeof this.mcp.stop === "function") {
        await this.mcp.stop();
      }

      serverLogger.info("Server shutdown complete");
    } catch (error) {
      serverLogger.error("Error during shutdown:", error);
      throw error;
    }
  }
}
