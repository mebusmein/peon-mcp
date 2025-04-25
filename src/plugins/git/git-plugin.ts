import { FastMCP } from "fastmcp";
import { BasePlugin } from "../base-plugin.js";
import type { ProcessManager } from "../../services/process-manager.js";
import type { PluginConfigWithProcessManager } from "../../types/plugin.types.js";
import type { GitPluginConfig } from "./config.js";
import { validateConfig } from "./config.js";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

/**
 * Git Plugin for interacting with git repositories
 */
export class GitPlugin extends BasePlugin {
  private gitConfig: GitPluginConfig;
  private processManager: ProcessManager;

  constructor(config: PluginConfigWithProcessManager) {
    super(config);

    // Validate and set plugin-specific config
    this.gitConfig = validateConfig(config);
    this.processManager = config.processManager;

    // Register the tools
    this.registerTools();
  }

  get name(): string {
    return "Git";
  }

  /**
   * Register the tools for this plugin
   */
  private registerTools(): void {
    this.addTool({
      name: "git_execute",
      description: "Execute a git command",
      parameters: z.object({
        command: z.string(),
        args: z.array(z.string()).optional(),
        cwd: z.string().optional(),
      }),
      execute: this.executeGitCommand.bind(this),
    });

    this.addTool({
      name: "git_create_branch",
      description: "Create a new git branch with optional template",
      parameters: z.object({
        name: z.string(),
        template: z.string().optional(),
        baseBranch: z.string().optional(),
      }),
      execute: this.createGitBranch.bind(this),
    });

    this.addTool({
      name: "git_commit",
      description: "Commit changes with a message",
      parameters: z.object({
        message: z.string(),
        addAll: z.boolean().optional(),
      }),
      execute: this.commitChanges.bind(this),
    });

    this.addTool({
      name: "git_push",
      description: "Push changes to remote repository",
      parameters: z.object({
        remote: z.string().optional(),
        branch: z.string().optional(),
        setUpstream: z.boolean().optional(),
      }),
      execute: this.pushChanges.bind(this),
    });
  }

  /**
   * Execute a git command
   * @param params Tool parameters with command and args
   * @returns Command output
   */
  private async executeGitCommand(params: Record<string, any>): Promise<any> {
    const command = params.command as string;
    const args = (params.args as string[]) || [];
    const cwd = (params.cwd as string) || process.cwd();

    if (!command) {
      throw new Error("Git command is required");
    }

    // Check if command is allowed
    if (!this.isCommandAllowed(command)) {
      throw new Error(`Git command '${command}' is not allowed`);
    }

    try {
      // Execute the git command
      const { stdout, stderr } = await execAsync(
        `git ${command} ${args.join(" ")}`,
        { cwd }
      );

      return {
        command: `git ${command} ${args.join(" ")}`,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: true,
      };
    } catch (error: any) {
      console.error(`Error executing git command '${command}':`, error);

      return {
        command: `git ${command} ${args.join(" ")}`,
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || error.message,
        success: false,
      };
    }
  }

  /**
   * Create a new git branch
   * @param params Tool parameters with branch name and template
   * @returns Command output
   */
  private async createGitBranch(params: Record<string, any>): Promise<any> {
    const branchName = params.name as string;
    const templateName = params.template as string;
    const baseBranch = (params.baseBranch as string) || "main";
    const cwd = (params.cwd as string) || process.cwd();

    if (!branchName) {
      throw new Error("Branch name is required");
    }

    let finalBranchName = branchName;

    // Apply template if provided and exists
    if (
      templateName &&
      this.gitConfig.branchTemplates &&
      this.gitConfig.branchTemplates[templateName]
    ) {
      const template = this.gitConfig.branchTemplates[templateName];
      finalBranchName = template.replace("{name}", branchName);
    } else if (!templateName && this.gitConfig.defaultBranchTemplate) {
      // Apply default template if exists
      finalBranchName = this.gitConfig.defaultBranchTemplate.replace(
        "{name}",
        branchName
      );
    }

    try {
      // Make sure we're on the base branch
      await execAsync(`git checkout ${baseBranch}`, { cwd });

      // Create and checkout the new branch
      const { stdout, stderr } = await execAsync(
        `git checkout -b ${finalBranchName}`,
        { cwd }
      );

      return {
        command: `git checkout -b ${finalBranchName}`,
        branchName: finalBranchName,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: true,
      };
    } catch (error: any) {
      console.error(`Error creating git branch '${finalBranchName}':`, error);

      return {
        command: `git checkout -b ${finalBranchName}`,
        branchName: finalBranchName,
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || error.message,
        success: false,
      };
    }
  }

  /**
   * Commit changes with a message
   * @param params Tool parameters with commit message
   * @returns Command output
   */
  private async commitChanges(params: Record<string, any>): Promise<any> {
    const message = params.message as string;
    const addAll = (params.addAll as boolean) || true;
    const cwd = (params.cwd as string) || process.cwd();

    if (!message) {
      throw new Error("Commit message is required");
    }

    try {
      let stdout = "";
      let stderr = "";

      // Add all changes if requested
      if (addAll) {
        const addResult = await execAsync("git add -A", { cwd });
        stdout += addResult.stdout.trim();
        stderr += addResult.stderr.trim();
      }

      // Commit changes
      const commitResult = await execAsync(`git commit -m "${message}"`, {
        cwd,
      });
      stdout += (stdout ? "\n" : "") + commitResult.stdout.trim();
      stderr += (stderr ? "\n" : "") + commitResult.stderr.trim();

      return {
        command: `git commit -m "${message}"`,
        stdout,
        stderr,
        success: true,
      };
    } catch (error: any) {
      console.error(`Error committing changes:`, error);

      return {
        command: `git commit -m "${message}"`,
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || error.message,
        success: false,
      };
    }
  }

  /**
   * Push changes to remote repository
   * @param params Tool parameters
   * @returns Command output
   */
  private async pushChanges(params: Record<string, any>): Promise<any> {
    const remote = (params.remote as string) || "origin";
    const branch = params.branch as string;
    const setUpstream = (params.setUpstream as boolean) || false;
    const cwd = (params.cwd as string) || process.cwd();

    try {
      // Get current branch if not specified
      let currentBranch = branch;
      if (!currentBranch) {
        const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
          cwd,
        });
        currentBranch = stdout.trim();
      }

      // Build the push command
      let pushCommand = `git push ${remote} ${currentBranch}`;
      if (setUpstream) {
        pushCommand = `git push -u ${remote} ${currentBranch}`;
      }

      // Execute the push command
      const { stdout, stderr } = await execAsync(pushCommand, { cwd });

      return {
        command: pushCommand,
        branch: currentBranch,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: true,
      };
    } catch (error: any) {
      console.error(`Error pushing changes:`, error);

      return {
        command: `git push ${remote} ${branch || "current branch"}`,
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || error.message,
        success: false,
      };
    }
  }

  /**
   * Check if a git command is allowed
   * @param command Git command to check
   * @returns True if allowed, false otherwise
   */
  private isCommandAllowed(command: string): boolean {
    return this.gitConfig.allowedCommands.includes(command);
  }

  /**
   * Clean up resources when shutting down
   */
  async shutdown(): Promise<void> {
    // Nothing to clean up for the git plugin
  }
}
