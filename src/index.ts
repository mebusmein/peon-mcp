import path from "path";
import { logger } from "./services/logging/index.js";
import { Server } from "./server.js";

import type { LogLevel } from "./services/logging/ILoggerConfig.js";
import { initConfig, loadConfig, Config } from "./config/index.js";

const indexLogger = logger.withPrefix("Index");

/**
 * Main entry point for the MCP server
 */
async function main() {
  try {
    // Initialize configuration
    initConfig({
      baseDir: process.cwd(),
      fileName: "config",
      environment: process.env.NODE_ENV || "development",
    });

    // Load configuration
    const config = await loadConfig();

    // Initialize logger with config
    logger.updateConfig({
      prefix: "",
      level: config.logging.level as LogLevel,
      timestamp: config.logging.timestamp,
      logFilePath: config.logging.file.path,
      maxFileSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
    });

    // Create and start server
    const server = new Server(config);
    await server.start();

    // Handle shutdown
    process.on("SIGINT", async () => {
      try {
        await server.shutdown();
        process.exit(0);
      } catch (error) {
        indexLogger.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    indexLogger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  indexLogger.error("Unhandled error:", error);
  process.exit(1);
});
