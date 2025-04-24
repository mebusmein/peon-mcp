import { Context, FastMCP } from "fastmcp";
import path from "path";
import { ConfigLoader } from "./config/config-loader";
import { ProcessManager } from "./services/process-manager";
import { PluginManager } from "./services/plugin-manager";
import { PluginDefinition } from "./types/plugin.types";
import { SessionContext } from "./types/plugin.types";

// Import plugin classes
import { ClaudeCodePlugin } from "./plugins/claude-code/claude-code-plugin";
import { GitPlugin } from "./plugins/git/git-plugin";
import { NpmPlugin } from "./plugins/npm/npm-plugin";

// Define available plugins
const availablePlugins: PluginDefinition[] = [
  {
    name: "claudeCode",
    pluginClass: ClaudeCodePlugin,
    configKey: "claudeCode",
  },
  {
    name: "git",
    pluginClass: GitPlugin,
    configKey: "git",
  },
  {
    name: "npm",
    pluginClass: NpmPlugin,
    configKey: "npm",
  },
];

/**
 * Main entry point for the MCP server
 */
async function main() {
  try {
    // Load configuration
    const configPath =
      process.env.CONFIG_PATH || path.join(process.cwd(), "config.json");
    console.log(`Loading configuration from ${configPath}`);
    const config = await ConfigLoader.loadConfig(configPath);

    // Create the MCP server
    const mcp = new FastMCP<SessionContext>({
      name: "peon-mcp",
      version: "1.0.0",
      authenticate: async (request) => {
        return {
          id: "2",
        };
      },
    });

    // Create the process manager
    const processManager = new ProcessManager(config.processManager);

    // Create the plugin manager
    const pluginManager = new PluginManager(mcp, config, processManager);

    // Load and register plugins
    await pluginManager.loadPlugins(availablePlugins);

    // Start the server
    await mcp.start({
      transportType: "sse",
      sse: {
        endpoint: "/mcp",
        port: config.port,
      },
    });

    console.log(
      `MCP server running at http://${config.host}:${config.port}/mcp`
    );

    // Handle shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down server...");

      try {
        // Shutdown plugins
        await pluginManager.shutdownPlugins();

        // Shutdown process manager
        await processManager.shutdown();

        // Close MCP server (if method is available)
        if (typeof mcp.stop === "function") {
          await mcp.stop();
        }

        console.log("Server shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
