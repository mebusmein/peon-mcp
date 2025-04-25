// Log levels enum

export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}
// Logger interface that all loggers must implement

export interface ILogger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  withPrefix(prefix: string): ILogger;
  updateConfig(config: ILoggerConfig): void;
}

// get the config type form the updateConfig method
export type ILoggerExtendedConfig<T extends ILogger> = Parameters<
  T["updateConfig"]
>[0];

export interface ILoggerConfig {
  prefix: string;
  level: LogLevel;
  timestamp: "iso" | "unix" | "none";
}
