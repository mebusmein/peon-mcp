import { ChildProcess, spawn } from "child_process";
import { ProcessManagerConfig } from "../types/config.types";

export interface ManagedProcess {
  id: string;
  process: ChildProcess;
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

    const childProcess = spawn(command, args, {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const managedProcess: ManagedProcess = {
      id,
      process: childProcess,
      command,
      args,
      startTime: new Date(),
      status: "running",
      metadata,
    };

    this.processes.set(id, managedProcess);

    // Handle process exit
    childProcess.on("exit", (code) => {
      if (code !== 0) {
        managedProcess.status = "error";
      } else {
        managedProcess.status = "stopped";
      }
    });

    childProcess.on("error", () => {
      managedProcess.status = "error";
    });

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
      managedProcess.process.kill();
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
   * Cleanup all processes
   */
  async shutdown(): Promise<void> {
    for (const process of this.processes.values()) {
      if (process.status === "running") {
        process.process.kill();
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
}
