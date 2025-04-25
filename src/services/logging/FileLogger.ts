import { format } from "util";
import fs from "fs";
import path from "path";
import type { ILogger, ILoggerConfig } from "./ILoggerConfig.js";
import { LogLevel } from "./ILoggerConfig.js";
import { BaseLogger } from "./BaseLogger.js";

export interface IFileLoggerConfig extends ILoggerConfig {
  logFilePath: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
}

export class FileLogger extends BaseLogger {
  private logFilePath: string;
  private maxFileSize: number;
  private maxFiles: number;
  private fileStream: fs.WriteStream | null = null;

  constructor(config: IFileLoggerConfig) {
    super(config);
    this.logFilePath = config.logFilePath;
    this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // Default 10MB
    this.maxFiles = config.maxFiles || 5; // Default 5 files

    this.updateConfig(config);
  }

  updateConfig(config: IFileLoggerConfig): void {
    // Ensure logFilePath is a file path, not a directory
    this.logFilePath = config.logFilePath.endsWith(path.sep)
      ? path.join(config.logFilePath, "app.log")
      : config.logFilePath;

    this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // Default 10MB
    this.maxFiles = config.maxFiles || 5; // Default 5 files

    // Ensure log directory exists
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // If the path points to a directory, throw an error
    if (
      fs.existsSync(this.logFilePath) &&
      fs.statSync(this.logFilePath).isDirectory()
    ) {
      throw new Error(
        `Log path ${this.logFilePath} is a directory. Please specify a file path.`
      );
    }

    this.initializeFileStream();
    super.updateConfig(config);
  }

  private initializeFileStream(): void {
    if (this.fileStream) {
      this.fileStream.end();
    }

    try {
      this.fileStream = fs.createWriteStream(this.logFilePath, {
        flags: "a",
        encoding: "utf8",
      });

      this.fileStream.on("error", (err) => {
        console.error("Error writing to log file:", err);
      });
    } catch (err) {
      console.error("Failed to initialize log file stream:", err);
      this.fileStream = null;
    }
  }

  private rotateLogFile(): void {
    if (!fs.existsSync(this.logFilePath)) {
      return;
    }

    const stats = fs.statSync(this.logFilePath);
    if (stats.size < this.maxFileSize) {
      return;
    }

    // Close current stream
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }

    // Rotate existing files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const currentFile =
        i === 1 ? this.logFilePath : `${this.logFilePath}.${i - 1}`;
      const nextFile = `${this.logFilePath}.${i}`;

      if (fs.existsSync(currentFile)) {
        fs.renameSync(currentFile, nextFile);
      }
    }

    // Initialize new stream
    this.initializeFileStream();
  }

  protected writeToFile(message: string): void {
    if (!this.fileStream) {
      return;
    }

    this.rotateLogFile();
    this.fileStream.write(message + "\n");
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage(
        LogLevel.ERROR,
        message,
        ...args
      );
      this.writeToFile(formattedMessage);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage(
        LogLevel.WARN,
        message,
        ...args
      );
      this.writeToFile(formattedMessage);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage(
        LogLevel.INFO,
        message,
        ...args
      );
      this.writeToFile(formattedMessage);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage(
        LogLevel.DEBUG,
        message,
        ...args
      );
      this.writeToFile(formattedMessage);
    }
  }

  createNewLogger(newPrefix: string): ILogger {
    return new FileLogger({
      prefix: newPrefix,
      level: this.level,
      timestamp: this.timestamp,
      logFilePath: this.logFilePath,
      maxFileSize: this.maxFileSize,
      maxFiles: this.maxFiles,
    });
  }

  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }
}
