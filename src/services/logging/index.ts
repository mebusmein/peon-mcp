import { CompositeLogger } from "./CompositeLogger.js";
import type { IFileLoggerConfig } from "./FileLogger.js";
import { FileLogger } from "./FileLogger.js";
import type { ILoggerConfig, ILogger} from "./ILoggerConfig.js";
import { LogLevel } from "./ILoggerConfig.js";
import { ConsoleLogger } from "./ConsoleLogger.js";

// Logger factory for creating loggers with different configurations
export class LoggerFactory {
  static createLogger(config: ILoggerConfig & IFileLoggerConfig) {
    return new CompositeLogger([
      new ConsoleLogger(config),
      new FileLogger(config),
    ]);
  }

  static createConsoleLogger(config: ILoggerConfig) {
    return new ConsoleLogger(config);
  }

  static createFileLogger(config: IFileLoggerConfig) {
    return new FileLogger(config);
  }

  static createCompositeLogger(loggers: ILogger[]): ILogger {
    return new CompositeLogger(loggers);
  }
}

// Default logger instance
export const logger = LoggerFactory.createLogger({
  prefix: "",
  level: LogLevel.INFO,
  timestamp: "none",
  logFilePath: "./logs/",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
});
