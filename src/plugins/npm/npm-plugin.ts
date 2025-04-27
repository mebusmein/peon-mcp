import { FastMCP } from "fastmcp";
import { BasePlugin } from "../base-plugin.js";
import { exec } from "child_process";
import { promisify } from "util";
import type { PluginConfigWithContext } from "../../types/plugin.types.js";
import type { NpmPluginConfig } from "./config.js";
import { validateConfig } from "./config.js";
import { z } from "zod";

const execAsync = promisify(exec);

/**
 * NPM Plugin for interacting with npm package manager
 */
export class NpmPlugin extends BasePlugin {
  private npmConfig: NpmPluginConfig;

  constructor(config: PluginConfigWithContext) {
    super(config);

    // Validate and set plugin-specific config
    this.npmConfig = validateConfig(config);

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
      }),
      execute: this.runScript.bind(this),
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

    if (!script) {
      throw new Error("Script name is required");
    }

    // Check if the command is allowed
    if (!this.isCommandAllowed("run")) {
      throw new Error(`NPM command 'run' is not allowed`);
    }

    // Run synchronously and return the output
    return this.executeNpmCommand({
      command: "run",
      args: [script, ...args],
      cwd,
    });
  }

  /**
   * Check if an npm command is allowed
   * @param command The command to check
   * @returns True if allowed, false otherwise
   */
  private isCommandAllowed(command: string): boolean {
    // if (this.npmConfig.allowedCommands === "*") {
    //   return true;
    // }

    return this.npmConfig.allowedCommands.includes(command);
  }

  /**
   * Check if arguments are allowed for a command
   * @param command The command
   * @param args Arguments to check
   * @returns True if all arguments are allowed
   */
  private areArgumentsAllowed(command: string, args: string[]): boolean {
    // If no args or all args are allowed, return true
    // if (args.length === 0 || this.npmConfig.allowedArguments === "*") {
    //   return true;
    // }

    // Check against allowed arguments patterns
    const commandArgsConfig =
      this.npmConfig.commandConfig?.[command]?.allowedArgs;
    if (!commandArgsConfig) {
      return false;
    }

    // if (commandArgsConfig === "*") {
    //   return true;
    // }

    // Check each argument against the allowed patterns
    return args.every((arg) => {
      return (
        typeof commandArgsConfig === "string" ||
        commandArgsConfig.some((pattern) => {
          if (typeof pattern === "string") {
            return arg === pattern;
          }
          // return pattern.test(arg);
        })
      );
    });
  }

  async shutdown(): Promise<void> {
    // Cleanup any resources used by the plugin
  }
}
