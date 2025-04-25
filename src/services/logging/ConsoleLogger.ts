import type { ILogger, ILoggerConfig } from "./ILoggerConfig.js";
import { LogLevel } from "./ILoggerConfig.js";
import { BaseLogger } from "./BaseLogger.js";

// Console logger implementation
export class ConsoleLogger extends BaseLogger {
  constructor(config: ILoggerConfig) {
    super(config);
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, ...args));
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, ...args));
    }
  }

  createNewLogger(newPrefix: string): ILogger {
    return new ConsoleLogger({
      prefix: newPrefix,
      level: this.level,
      timestamp: this.timestamp,
    });
  }
}
