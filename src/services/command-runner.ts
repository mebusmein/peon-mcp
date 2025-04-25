// import { spawn } from "child_process";
import ansiRegex from "ansi-regex";
import * as pty from "node-pty";
import type { IPty } from "node-pty";
import { logger } from "./logging/index.js";
import type { ILogger } from "./logging/ILoggerConfig.js";

// Default configuration
const DEFAULT_COMMAND_TIMEOUT = 10000;
const DEFAULT_CONNECTION_TIMEOUT = 15000;

// Configuration interface
export interface CommandRunnerConfig {
  id: string;
  command: string; // Main command to run
  args?: string[]; // Command arguments
  cwd?: string; // Working directory
  env?: NodeJS.ProcessEnv; // Environment variables
  shell?: string; // Shell to use
  commandTimeout?: number; // Timeout for commands in milliseconds
  connectionTimeout?: number; // Timeout for connection in milliseconds
}

// Create a logger for this service
const commandLogger = logger.withPrefix("CommandRunner");

export class CommandRunner {
  private process: IPty | null = null;
  private config: CommandRunnerConfig;
  private isConnected: boolean = false;
  private commandQueue: Array<{
    command: string;
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
  }> = [];
  private outputBuffer: string = "";
  private errorBuffer: string = "";
  private currentCommand: {
    command: string;
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
  } | null = null;
  private onDataListeners: ((data: string) => void)[] = [];
  private onErrorListeners: ((data: string) => void)[] = [];
  private onExitListeners: ((exitCode: number) => void)[] = [];
  private logger: ILogger;

  constructor(config: CommandRunnerConfig) {
    // Apply defaults for optional configuration parameters
    this.config = {
      id: config.id,
      command: config.command,
      args: config.args || [],
      cwd: config.cwd,
      env: config.env,
      shell: config.shell,
      commandTimeout: config.commandTimeout || DEFAULT_COMMAND_TIMEOUT,
      connectionTimeout: config.connectionTimeout || DEFAULT_CONNECTION_TIMEOUT,
    };

    this.logger = commandLogger.withPrefix(this.config.id);

    // Validate configuration
    if (!this.config.command) {
      throw new Error("Command is required");
    }
  }

  /**
   * Add a listener for data events
   */
  onData(listener: (data: string) => void): void {
    this.onDataListeners.push(listener);
  }

  /**
   * Add a listener for error events
   */
  onError(listener: (data: string) => void): void {
    this.onErrorListeners.push(listener);
  }

  /**
   * Add a listener for exit events
   */
  onExit(listener: (exitCode: number) => void): void {
    this.onExitListeners.push(listener);
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, return immediately
      if (this.isConnected && this.process) {
        return resolve();
      }

      // Spawn the process
      this.process = pty.spawn(this.config.command, this.config.args || [], {
        name: "xterm-256color",
        handleFlowControl: false,
        cwd: this.config.cwd,
        env: (this.config.env as Record<string, string>) || process.env,
      });

      this.outputBuffer = "";
      this.errorBuffer = "";

      // Set up event handlers for the process
      this.process.onData((data) => {
        const output = data.toString();
        this.logger.debug("Output: %s", output);
        this.outputBuffer += output;

        // Notify listeners
        this.onDataListeners.forEach((listener) => listener(output));

        // If we're processing a command, check if it's completed
        this.checkCommandCompletion();
      });

      this.process.onExit((e) => {
        this.logger.debug("Process exited with code %d", e.exitCode);

        // Notify listeners
        this.onExitListeners.forEach((listener) => listener(e.exitCode));

        if (e.exitCode !== 0 && !this.isConnected) {
          reject(new Error(`Process exited with code ${e.exitCode}`));
        } else if (this.currentCommand) {
          this.currentCommand.reject(
            new Error(
              `Command execution failed: Process exited with code ${e.exitCode}`
            )
          );
          this.currentCommand = null;
          this.processNextCommand();
        }

        this.isConnected = false;
        this.process = null;
      });

      // Set a timeout to wait for initial connection
      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          reject(
            new Error(
              `Connection timeout executing command ${this.config.command}`
            )
          );
        }
      }, this.config.connectionTimeout);

      // Wait for some indication that we're ready
      const checkConnection = setInterval(() => {
        // If we've received some output that indicates a successful start
        if (
          this.outputBuffer.includes("$") ||
          this.outputBuffer.includes("#") ||
          this.outputBuffer.includes("%") ||
          this.outputBuffer.includes(">")
        ) {
          clearInterval(checkConnection);
          clearTimeout(timeout);
          this.isConnected = true;
          this.outputBuffer = "";
          this.logger.info("Process started successfully");
          resolve();
        } else if (
          this.errorBuffer.includes("Error") ||
          this.errorBuffer.includes("failed") ||
          this.errorBuffer.includes("timed out")
        ) {
          clearInterval(checkConnection);
          clearTimeout(timeout);
          reject(
            new Error(
              `Failed to start process ${this.config.command}: ${this.errorBuffer}`
            )
          );
        }
      }, 500);
    });
  }

  /**
   * Start the process, execute a single command, and then stop the process
   * @param command The command to execute
   * @returns The command output
   */
  async runSingleCommand(): Promise<string> {
    try {
      // Start the process
      const output = await this.start();
      // Stop the process
      this.stop();

      if (typeof output !== "string") {
        throw new Error("Command execution result is not a string");
      }

      return output;
    } catch (error) {
      // Make sure to stop the process if there's an error
      if (this.isRunning()) {
        this.stop();
      }
      throw error;
    }
  }

  async executeCommand(command: string): Promise<string> {
    const result = await new Promise((resolve, reject) => {
      if (!this.isConnected || !this.process) {
        return reject(new Error(`Process not running: ${this.config.command}`));
      }

      this.logger.debug("Executing command: %s", command);

      // Queue this command for execution
      this.queueCommand(command, resolve, reject);
    });

    if (typeof result !== "string") {
      throw new Error("Command execution result is not a string");
    }

    let output = result;

    // strip ANSI escape codes from the result
    output = output.replace(ansiRegex(), "");

    // strip the first lines containing the command prompt
    output = output.replace(/^.*\n/, "");

    // strip any trailing whitespace
    output = output.trim();

    return output;
  }

  private queueCommand(
    command: string,
    resolve: (value: string) => void,
    reject: (reason: Error) => void
  ): void {
    // Add command to queue
    this.commandQueue.push({ command, resolve, reject });

    // If no command is currently being processed, process this one
    if (!this.currentCommand) {
      this.processNextCommand();
    }
  }

  private processNextCommand(): void {
    if (
      this.commandQueue.length === 0 ||
      this.currentCommand ||
      !this.process
    ) {
      return;
    }

    // Get the next command
    this.currentCommand = this.commandQueue.shift()!;
    this.outputBuffer = "";
    this.errorBuffer = "";

    // Send the command to the process
    if (this.process.write) {
      this.process.write(this.currentCommand.command + "\n");

      // Set a timeout for command execution
      setTimeout(() => {
        if (this.currentCommand) {
          // If we still have the same command after timeout, assume it completed
          // and we just didn't get a clear completion indicator
          const output = this.outputBuffer;
          const resolve = this.currentCommand.resolve;
          this.currentCommand = null;
          resolve(output);
          this.processNextCommand();
        }
      }, this.config.commandTimeout);
    } else {
      if (this.currentCommand) {
        this.currentCommand.reject(new Error("Process stdin is not available"));
        this.currentCommand = null;
        this.processNextCommand();
      }
    }
  }

  private checkCommandCompletion(): void {
    if (!this.currentCommand) {
      return;
    }

    // Check for common shell prompt patterns, including those with ANSI escape sequences
    const promptPatterns = [
      // Basic shell prompts
      "\n$ ",
      "\r\n$ ",
      "\n# ",
      "\r\n# ",
      // Prompts that may have ANSI color codes
      // /\n\x1b\[[0-9;]*m[$#]/,
      // /\r\n\x1b\[[0-9;]*m[$#]/,
      // Common bash/zsh prompt endings
      "\n% ",
      "\r\n% ",
      // Command prompt (Windows)
      "\n> ",
      "\r\n> ",
      // Generic prompt pattern (line ending followed by common prompt chars)
      /[\n\r]+.*[$#%>]\s*$/,
    ];

    const hasPrompt = promptPatterns.some((pattern) => {
      if (typeof pattern === "string") {
        return this.outputBuffer.includes(pattern);
      } else {
        return pattern.test(this.outputBuffer);
      }
    });

    if (hasPrompt) {
      const output = this.outputBuffer.trim();
      const resolve = this.currentCommand.resolve;
      this.currentCommand = null;
      resolve(output);
      this.processNextCommand();
    }
  }

  stop(): void {
    if (this.process) {
      this.logger.debug("Terminating process");
      this.process.kill();
      this.process = null;
      this.isConnected = false;
    } else {
      this.logger.debug("Process already terminated or not established");
    }
  }

  /**
   * Check if the process is running
   */
  isRunning(): boolean {
    return this.isConnected && this.process !== null;
  }

  /**
   * Update the service configuration
   * @param config New configuration parameters (partial)
   */
  updateConfig(config: Partial<CommandRunnerConfig>): void {
    if (this.isConnected) {
      this.stop();
    }

    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Write raw input to the process without waiting for a response
   */
  write(input: string): void {
    if (this.process && this.isConnected) {
      this.process.write(input);
    } else {
      throw new Error("Cannot write to process: not connected");
    }
  }

  /**
   * Get the current buffered output
   */
  getOutput(): string {
    return this.outputBuffer;
  }
}
