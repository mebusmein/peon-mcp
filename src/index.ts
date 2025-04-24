import { Context, FastMCP } from "fastmcp";
import path from "path";
import { ConfigLoader } from "./config/config-loader.js";
import { ProcessManager } from "./services/process-manager.js";
import { PluginManager } from "./services/plugin-manager.js";
import { PluginDefinition } from "./types/plugin.types.js";
import { SessionContext } from "./types/plugin.types.js";

// Import plugin classes
import { ClaudeCodePlugin } from "./plugins/claude-code/claude-code-plugin.js";
import { GitPlugin } from "./plugins/git/git-plugin.js";
import { NpmPlugin } from "./plugins/npm/npm-plugin.js";

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
 * Shows help message
 */
function showHelp() {
  console.log(`
Peon MCP - Modular MCP server

Usage:
  node dist/index.js [options]

Options:
  --stdio       Run server with stdio transport (default: sse)
  --help, -h    Show this help message and exit
`);
  process.exit(0);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    transportType: "sse" as "sse" | "stdio",
    showHelp: false,
  };

  for (const arg of args) {
    if (arg === "--stdio") {
      options.transportType = "stdio";
    } else if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
    }
  }

  return options;
}

/**
 * Main entry point for the MCP server
 */
async function main() {
  try {
    // Parse command line arguments
    const options = parseArgs();

    // Show help if requested
    if (options.showHelp) {
      showHelp();
      return;
    }

    // Log startup information
    console.log(
      `Starting Peon MCP server with ${options.transportType} transport`
    );

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

    // Configure transport based on the specified type
    if (options.transportType === "stdio") {
      // Start the server with stdio transport
      await mcp.start({
        transportType: "stdio",
      });
      console.log("MCP server running in stdio mode");
    } else {
      // Start the server with SSE transport
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
    }

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
