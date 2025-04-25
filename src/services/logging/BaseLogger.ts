import { format } from "util";
import type { ILogger, ILoggerConfig } from "./ILoggerConfig.js";
import { LogLevel } from "./ILoggerConfig.js";

// Base logger implementation
export abstract class BaseLogger implements ILogger {
  protected prefix: string;
  protected level: LogLevel;
  protected timestamp: "iso" | "unix" | "none";
  protected subLoggers: ILogger[];

  constructor(config: ILoggerConfig) {
    this.prefix = config.prefix;
    this.level = config.level;
    this.timestamp = config.timestamp || "iso";
    this.subLoggers = [];
  }

  updateConfig(config: ILoggerConfig): void {
    this.prefix = config.prefix;
    this.level = config.level;
    this.timestamp = config.timestamp || "iso";
    this.subLoggers.forEach((logger) => {
      logger.updateConfig(config);
    });
  }

  protected shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ];
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  protected formatMessage(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): string {
    const messageArray = [];
    if (this.timestamp !== "none") messageArray.push(this.getTimestamp());
    if (this.prefix) messageArray.push(`[${this.prefix}]`);
    messageArray.push(level);
    messageArray.push(format(message, ...args));
    return messageArray.join(" ");
  }

  protected getTimestamp(): string {
    return this.timestamp === "iso"
      ? new Date().toISOString()
      : this.timestamp === "unix"
      ? new Date().getTime().toString()
      : "";
  }

  abstract error(message: string, ...args: any[]): void;

  abstract warn(message: string, ...args: any[]): void;

  abstract info(message: string, ...args: any[]): void;

  abstract debug(message: string, ...args: any[]): void;

  protected getPrefix(prefix: string): string {
    return this.prefix ? `${this.prefix}:${prefix}` : prefix;
  }

  abstract createNewLogger(prefix: string): ILogger;

  withPrefix(prefix: string): ILogger {
    const newLogger = this.createNewLogger(this.getPrefix(prefix));
    this.subLoggers.push(newLogger);
    return newLogger;
  }
}
