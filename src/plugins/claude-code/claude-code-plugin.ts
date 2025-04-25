import type { Context} from "fastmcp";
import { FastMCP } from "fastmcp";
import { BasePlugin } from "../base-plugin.js";
import type { ProcessManager } from "../../services/process-manager.js";
import type {
  PluginConfigWithProcessManager,
  SessionContext,
} from "../../types/plugin.types.js";
import type { ClaudeCodePluginConfig } from "./config.js";
import { validateConfig } from "./config.js";
import crypto from "crypto";
import { z } from "zod";
/**
 * Claude Code Plugin for interacting with Claude AI processes
 */
export class ClaudeCodePlugin extends BasePlugin {
  private claudeConfig: ClaudeCodePluginConfig;
  private processManager: ProcessManager;

  constructor(config: PluginConfigWithProcessManager) {
    super(config);
    // Validate and set plugin-specific config
    this.claudeConfig = validateConfig(config);
    this.processManager = config.processManager;

    // Register the tools
    this.registerTools();
  }

  get name(): string {
    return "Claude Code";
  }

  /**
   * Register the tools for this plugin
   */
  private registerTools(): void {
    this.addTool({
      name: "claude_send_prompt",
      description: "Send a prompt to a running Claude AI",
      parameters: z.object({
        prompt: z.string(),
      }),
      execute: this.sendPrompt.bind(this),
    });
  }

  /**
   * Send a prompt to a running Claude AI session
   * @param params Tool parameters with sessionId and prompt
   * @returns Claude's response
   */
  private async sendPrompt(
    params: { prompt: string },
    context: Context<SessionContext>
  ): Promise<any> {
    const prompt = params.prompt as string;
    const sessionId = context.session?.id;

    const command = `claude -p ${prompt}`;

    if (!sessionId) {
      return "No session ID provided";
    }

    if (!prompt) {
      return "No prompt provided";
    }

    try {
      const response = await this.processManager.executeProcessCommand(
        sessionId,
        command
      );

      return response;
    } catch (error) {
      console.error(
        `Error sending prompt to Claude session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clean up resources when shutting down
   */
  async shutdown(): Promise<void> {
    // Stop all Claude processes
    const allProcesses = this.processManager.getAllProcesses();
    const claudeProcesses = allProcesses.filter(
      (p) => p.metadata.type === "claude"
    );

    for (const process of claudeProcesses) {
      await this.processManager.stopProcess(process.id);
    }
  }
}
