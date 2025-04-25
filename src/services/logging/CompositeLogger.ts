import type {
  ILogger,
  ILoggerExtendedConfig} from "./ILoggerConfig.js";
import {
  ILoggerConfig
} from "./ILoggerConfig.js";

// Composite logger that can combine multiple loggers
export class CompositeLogger<T extends ILogger> implements ILogger {
  private loggers: T[];
  private subLoggers: CompositeLogger<T>[];

  constructor(loggers: T[]) {
    this.loggers = loggers;
    this.subLoggers = [];
  }

  updateConfig(config: ILoggerExtendedConfig<T>): void {
    this.loggers.forEach((logger) => logger.updateConfig(config));
    this.subLoggers.forEach((logger) => logger.updateConfig(config));
  }

  error(message: string, ...args: any[]): void {
    this.loggers.forEach((logger) => logger.error(message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    this.loggers.forEach((logger) => logger.warn(message, ...args));
  }

  info(message: string, ...args: any[]): void {
    this.loggers.forEach((logger) => logger.info(message, ...args));
  }

  debug(message: string, ...args: any[]): void {
    this.loggers.forEach((logger) => logger.debug(message, ...args));
  }

  withPrefix(prefix: string): CompositeLogger<T> {
    const newLogger = new CompositeLogger<T>(
      this.loggers.map((logger) => logger.withPrefix(prefix) as T)
    );
    this.subLoggers.push(newLogger);
    return newLogger;
  }
}
