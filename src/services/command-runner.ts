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
  private currentCommand: {
    command: string;
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
  } | null = null;
  private onDataListeners: ((data: string) => void)[] = [];
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

      // Set up event handlers for the process
      this.process.onData((data) => {
        const output = data.toString();
        this.logger.debug("Output: %s", output);
        this.outputBuffer += output;

        // Notify listeners
        this.onDataListeners.forEach((listener) => listener(output));

        // Check for connection prompt during startup phase
        if (!this.isConnected && this.hasShellPrompt(this.outputBuffer)) {
          this.isConnected = true;
          this.logger.info("Process started successfully");
          this.outputBuffer = "";
          resolve();
        }

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

      // Set a timeout to assume connection is successful after a period
      setTimeout(() => {
        if (!this.isConnected && this.process) {
          this.logger.info("No explicit prompt detected, assuming connected");
          this.isConnected = true;
          this.outputBuffer = "";
          resolve();
        } else if (!this.isConnected) {
          reject(
            new Error(
              `Connection timeout executing command ${this.config.command}`
            )
          );
        }
      }, this.config.connectionTimeout);
    });
  }

  async executeCommand(command: string): Promise<string> {
    console.log("Executing command: %s", this.isConnected, this.process);
    if (!this.isConnected || !this.process) {
      throw new Error(`Process not running: ${this.config.command}`);
    }

    this.logger.debug("Executing command: %s", command);

    const result = await new Promise<string>((resolve, reject) => {
      // Queue this command for execution
      this.queueCommand(command, resolve, reject);
    });

    // Clean up the result:
    // 1. Strip ANSI escape codes
    // 2. Remove the command echo line
    // 3. Remove trailing whitespace and prompt
    let output = result.replace(ansiRegex(), "");

    // Find and remove the command echo line (first line often echoes the command)
    const commandEchoIndex = output.indexOf(command);
    if (commandEchoIndex >= 0) {
      const newlineAfterCommand = output.indexOf("\n", commandEchoIndex);
      if (newlineAfterCommand >= 0) {
        output = output.substring(newlineAfterCommand + 1);
      }
    }

    // Remove prompt from the end and trim
    output = this.removePromptFromEnd(output).trim();

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

    // Send the command to the process
    if (this.process.write) {
      this.process.write(this.currentCommand.command + "\n");

      // Set a timeout for command execution
      setTimeout(() => {
        if (this.currentCommand) {
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

    if (this.hasShellPrompt(this.outputBuffer)) {
      const output = this.outputBuffer;
      const resolve = this.currentCommand.resolve;
      this.currentCommand = null;
      resolve(output);
      this.processNextCommand();
    }
  }

  private hasShellPrompt(output: string): boolean {
    // Check for common shell prompt patterns - more permissive now
    return (
      // Common shell prompts
      output.includes("$ ") ||
      output.includes("# ") ||
      output.includes("% ") ||
      output.includes("> ") ||
      // Pattern for line ending followed by prompt character
      /[\r\n][^]*[$#%>]\s*$/.test(output) ||
      // More general check for common terminal ready indicators
      output.includes("ready") ||
      output.includes("login") ||
      output.includes("password") ||
      output.includes("successfully")
    );
  }

  private removePromptFromEnd(output: string): string {
    // Remove the shell prompt from the end of the output
    return output.replace(/[\r\n].*[$#%>]\s*$/, "");
  }

  stop(): void {
    if (this.process) {
      this.logger.debug("Terminating process");
      this.process.kill();
      this.process = null;
      this.isConnected = false;
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
}
