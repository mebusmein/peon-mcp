import { CommandRunner } from "./command-runner.js";
import { ProcessManagerConfig } from "../types/config.types.js";

export interface ManagedProcess {
  id: string;
  runner: CommandRunner;
  command: string;
  args: string[];
  startTime: Date;
  status: "running" | "stopped" | "error";
  metadata: Record<string, any>;
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();
  private config: ProcessManagerConfig;

  constructor(config: ProcessManagerConfig) {
    this.config = config;
    this.startMonitoring();
  }

  /**
   * Start a new process
   * @param id Unique identifier for the process
   * @param command Command to run
   * @param args Command arguments
   * @param metadata Additional metadata for the process
   * @returns The managed process object
   */
  async startProcess(
    id: string,
    command: string,
    args: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<ManagedProcess> {
    if (this.processes.size >= this.config.maxProcesses) {
      throw new Error(
        `Maximum number of processes (${this.config.maxProcesses}) reached`
      );
    }

    if (this.processes.has(id)) {
      throw new Error(`Process with ID "${id}" already exists`);
    }

    console.log(`[${id}]: starting process ${command} ${args.join(" ")}`);

    const runner = new CommandRunner({
      command,
      args,
      commandTimeout: 30000,
      connectionTimeout: 15000,
    });

    const managedProcess: ManagedProcess = {
      id,
      runner,
      command,
      args,
      startTime: new Date(),
      status: "running",
      metadata,
    };

    this.processes.set(id, managedProcess);

    // Set up event handlers
    runner.onData((data: string) => {
      console.log(`[${id}]: ${data}`);
    });

    runner.onExit((exitCode: number) => {
      console.log(`[${id}]: process exited with code ${exitCode}`);
      if (exitCode !== 0) {
        managedProcess.status = "error";
      } else {
        managedProcess.status = "stopped";
      }
    });

    try {
      await runner.start();
    } catch (error) {
      console.error(`[${id}]: failed to start process`, error);
      managedProcess.status = "error";
    }

    return managedProcess;
  }

  /**
   * Stop a running process
   * @param id Process ID to stop
   * @returns True if process was stopped, false if not found
   */
  async stopProcess(id: string): Promise<boolean> {
    const managedProcess = this.processes.get(id);
    if (!managedProcess) {
      return false;
    }

    if (managedProcess.status === "running") {
      managedProcess.runner.stop();
      managedProcess.status = "stopped";
    }

    return true;
  }

  /**
   * Get a process by ID
   * @param id Process ID
   * @returns The managed process or undefined if not found
   */
  getProcess(id: string): ManagedProcess | undefined {
    return this.processes.get(id);
  }

  /**
   * Get all managed processes
   * @returns Array of all managed processes
   */
  getAllProcesses(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Execute a command in a process and return its output
   * @param id Process ID to execute command in
   * @param command Command to execute
   * @returns Promise with command output
   */
  async executeProcessCommand(id: string, command: string): Promise<string> {
    const managedProcess = this.processes.get(id);
    if (!managedProcess) {
      throw new Error(`Process with ID "${id}" not found`);
    }

    if (managedProcess.status !== "running") {
      throw new Error(`Process with ID "${id}" is not running`);
    }

    return managedProcess.runner.executeCommand(command);
  }

  /**
   * Write input to a running process
   * @param id Process ID
   * @param input Text to write to process stdin
   */
  async writeToProcess(id: string, input: string): Promise<void> {
    const managedProcess = this.processes.get(id);
    if (!managedProcess) {
      throw new Error(`Process with ID "${id}" not found`);
    }

    if (managedProcess.status !== "running") {
      throw new Error(`Process with ID "${id}" is not running`);
    }

    managedProcess.runner.write(input);
  }

  /**
   * Get current output buffer from a process
   * @param id Process ID
   * @returns Current output buffer content
   */
  getProcessOutput(id: string): string {
    const managedProcess = this.processes.get(id);
    if (!managedProcess) {
      throw new Error(`Process with ID "${id}" not found`);
    }

    return managedProcess.runner.getOutput();
  }

  /**
   * Cleanup all processes
   */
  async shutdown(): Promise<void> {
    for (const process of this.processes.values()) {
      if (process.status === "running") {
        process.runner.stop();
      }
    }
    this.processes.clear();
  }

  /**
   * Start monitoring processes
   */
  private startMonitoring(): void {
    setInterval(() => {
      for (const [id, process] of this.processes.entries()) {
        // Clean up exited processes that are no longer needed
        if (
          process.status !== "running" &&
          new Date().getTime() - process.startTime.getTime() > 5 * 60 * 1000
        ) {
          this.processes.delete(id);
        }
      }
    }, this.config.checkIntervalMs);
  }

  /**
   * Run a single command and return the output without keeping the process running
   * @param command Command to start the process with
   * @param args Command arguments for the main process
   * @param options Additional options
   * @returns Promise with command output
   */
  async runCommand(
    command: string,
    args: string[] = [],
    options: {
      timeout?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    console.log(`Running command ${command} ${args.join(" ")}`);

    const runner = new CommandRunner({
      command,
      args,
      commandTimeout: options.timeout || 30000,
      connectionTimeout: options.timeout || 15000,
    });

    try {
      // This will start the process, run the command, and then stop the process
      return await runner.runSingleCommand();
    } catch (error) {
      console.error(`Failed to run command : ${command}`, error);
      throw error;
    }
  }
}
