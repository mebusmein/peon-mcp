import { FastMCP } from "fastmcp";
import { BasePlugin } from "../base-plugin.js";
import type {
  ProcessManager} from "../../services/process-manager.js";
import {
  ManagedProcess,
} from "../../services/process-manager.js";
import type { PluginConfigWithProcessManager } from "../../types/plugin.types.js";
import type { NpmPluginConfig } from "./config.js";
import { validateConfig } from "./config.js";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

/**
 * NPM Plugin for interacting with npm package manager
 */
export class NpmPlugin extends BasePlugin {
  private npmConfig: NpmPluginConfig;
  private processManager: ProcessManager;

  constructor(config: PluginConfigWithProcessManager) {
    super(config);

    // Validate and set plugin-specific config
    this.npmConfig = validateConfig(config);
    this.processManager = config.processManager;

    // Register the tools
    this.registerTools();
  }

  get name(): string {
    return "NPM";
  }

  /**
   * Register the tools for this plugin
   */
  private registerTools(): void {
    this.addTool({
      name: "npm_execute",
      description: "Execute an npm command with arguments",
      parameters: z.object({
        command: z.string(),
        args: z.array(z.string()).optional(),
        cwd: z.string().optional(),
      }),
      execute: this.executeNpmCommand.bind(this),
    });

    this.addTool({
      name: "npm_install",
      description: "Install npm packages",
      parameters: z.object({
        packages: z.array(z.string()),
        dev: z.boolean().optional(),
        global: z.boolean().optional(),
        cwd: z.string().optional(),
      }),
      execute: this.installPackages.bind(this),
    });

    this.addTool({
      name: "npm_run",
      description: "Run an npm script",
      parameters: z.object({
        script: z.string(),
        args: z.array(z.string()).optional(),
        cwd: z.string().optional(),
        background: z.boolean().optional(),
      }),
      execute: this.runScript.bind(this),
    });

    this.addTool({
      name: "npm_list_running",
      description: "List currently running npm processes",
      parameters: z.object({}),
      execute: this.listRunningProcesses.bind(this),
    });

    this.addTool({
      name: "npm_stop_process",
      description: "Stop a running npm process",
      parameters: z.object({
        processId: z.string(),
      }),
      execute: this.stopProcess.bind(this),
    });
  }

  /**
   * Execute an npm command
   * @param params Tool parameters with command and args
   * @returns Command output
   */
  private async executeNpmCommand(params: Record<string, any>): Promise<any> {
    const command = params.command as string;
    const args = (params.args as string[]) || [];
    const cwd = (params.cwd as string) || process.cwd();

    if (!command) {
      throw new Error("NPM command is required");
    }

    // Check if command is allowed
    if (!this.isCommandAllowed(command)) {
      throw new Error(`NPM command '${command}' is not allowed`);
    }

    // Check if arguments are allowed
    const argsString = args.join(" ");
    if (!this.areArgumentsAllowed(command, args)) {
      throw new Error(
        `Some arguments for npm ${command} are not allowed: ${argsString}`
      );
    }

    try {
      // Execute the npm command
      const { stdout, stderr } = await execAsync(
        `npm ${command} ${argsString}`,
        { cwd }
      );

      return {
        command: `npm ${command} ${argsString}`,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: true,
      };
    } catch (error: any) {
      console.error(`Error executing npm command '${command}':`, error);

      return {
        command: `npm ${command} ${argsString}`,
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || error.message,
        success: false,
      };
    }
  }

  /**
   * Install npm packages
   * @param params Tool parameters with packages to install
   * @returns Command output
   */
  private async installPackages(params: Record<string, any>): Promise<any> {
    const packages = (params.packages as string[]) || [];
    const isDev = (params.dev as boolean) || false;
    const isGlobal = (params.global as boolean) || false;
    const cwd = (params.cwd as string) || process.cwd();

    // Build the install command
    let command = "install";
    if (isDev) {
      command += " --save-dev";
    }
    if (isGlobal) {
      command += " -g";
    }

    // Add packages
    const packageString = packages.join(" ");

    return this.executeNpmCommand({
      command,
      args: packages,
      cwd,
    });
  }

  /**
   * Run an npm script
   * @param params Tool parameters with script name
   * @returns Process information or command output
   */
  private async runScript(params: Record<string, any>): Promise<any> {
    const script = params.script as string;
    const args = (params.args as string[]) || [];
    const cwd = (params.cwd as string) || process.cwd();
    const background = (params.background as boolean) || false;

    if (!script) {
      throw new Error("Script name is required");
    }

    // Check if the command is allowed
    if (!this.isCommandAllowed("run")) {
      throw new Error(`NPM command 'run' is not allowed`);
    }

    // If running in background, use the process manager
    if (background) {
      const processId = `npm_run_${script}_${Date.now()}`;
      const command = "npm";
      const commandArgs = ["run", script, ...args];

      try {
        const process = await this.processManager.startProcess(
          processId,
          command,
          commandArgs,
          {
            type: "npm",
            script,
            cwd,
          }
        );

        return {
          processId,
          command: `npm run ${script} ${args.join(" ")}`,
          status: process.status,
          startTime: process.startTime,
        };
      } catch (error) {
        console.error(
          `Error starting npm script '${script}' in background:`,
          error
        );
        throw error;
      }
    } else {
      // Run synchronously and return the output
      return this.executeNpmCommand({
        command: "run",
        args: [script, ...args],
        cwd,
      });
    }
  }

  /**
   * List running npm processes
   * @returns List of running processes
   */
  private async listRunningProcesses(): Promise<any> {
    try {
      const allProcesses = this.processManager.getAllProcesses();
      const npmProcesses = allProcesses.filter(
        (p) => p.metadata.type === "npm"
      );

      return {
        processes: npmProcesses.map((p) => ({
          processId: p.id,
          command: `npm ${p.args.join(" ")}`,
          script: p.metadata.script,
          status: p.status,
          startTime: p.startTime,
        })),
        count: npmProcesses.length,
      };
    } catch (error) {
      console.error("Error listing npm processes:", error);
      throw error;
    }
  }

  /**
   * Stop a running npm process
   * @param params Tool parameters with processId
   * @returns Status of the operation
   */
  private async stopProcess(params: Record<string, any>): Promise<any> {
    const processId = params.processId as string;

    if (!processId) {
      throw new Error("Process ID is required");
    }

    try {
      const stopped = await this.processManager.stopProcess(processId);

      if (!stopped) {
        throw new Error(`No npm process found with ID: ${processId}`);
      }

      return {
        processId,
        status: "stopped",
        message: `NPM process ${processId} has been stopped`,
      };
    } catch (error) {
      console.error(`Error stopping npm process ${processId}:`, error);
      throw error;
    }
  }

  /**
   * Check if an npm command is allowed
   * @param command NPM command to check
   * @returns True if allowed, false otherwise
   */
  private isCommandAllowed(command: string): boolean {
    if (this.npmConfig.mode === "whitelist") {
      return this.npmConfig.allowedCommands.includes(command);
    } else {
      return !this.npmConfig.blockedCommands.includes(command);
    }
  }

  /**
   * Check if arguments for an npm command are allowed
   * @param command NPM command
   * @param args Command arguments
   * @returns True if all arguments are allowed, false otherwise
   */
  private areArgumentsAllowed(command: string, args: string[]): boolean {
    // If no command-specific config exists, allow all arguments
    if (
      !this.npmConfig.commandConfig ||
      !this.npmConfig.commandConfig[command]
    ) {
      return true;
    }

    const commandConfig = this.npmConfig.commandConfig[command];

    // If no allowed or blocked args are specified, allow all
    if (!commandConfig.allowedArgs && !commandConfig.blockedArgs) {
      return true;
    }

    // Check against allowed args (if defined)
    if (commandConfig.allowedArgs) {
      return args.every((arg) => {
        // Extract the argument name (without value)
        const argName = arg.startsWith("--") ? arg.split("=")[0] : arg;
        return commandConfig.allowedArgs!.some(
          (allowed) => argName === allowed || argName.startsWith(allowed)
        );
      });
    }

    // Check against blocked args (if defined)
    if (commandConfig.blockedArgs) {
      return !args.some((arg) => {
        // Extract the argument name (without value)
        const argName = arg.startsWith("--") ? arg.split("=")[0] : arg;
        return commandConfig.blockedArgs!.some(
          (blocked) => argName === blocked || argName.startsWith(blocked)
        );
      });
    }

    return true;
  }

  /**
   * Clean up resources when shutting down
   */
  async shutdown(): Promise<void> {
    // Stop all npm processes
    const allProcesses = this.processManager.getAllProcesses();
    const npmProcesses = allProcesses.filter((p) => p.metadata.type === "npm");

    for (const process of npmProcesses) {
      await this.processManager.stopProcess(process.id);
    }
  }
}
