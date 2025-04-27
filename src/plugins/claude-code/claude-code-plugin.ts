import type { Context } from "fastmcp";
import { FastMCP } from "fastmcp";
import { BasePlugin } from "../base-plugin.js";
import type {
  PluginConfigWithContext,
  SessionContext,
} from "../../types/plugin.types.js";
import type { ClaudeCodePluginConfig } from "./config.js";
import { validateConfig } from "./config.js";
import crypto from "crypto";
import { z } from "zod";
import { execa } from "execa";
/**
 * Claude Code Plugin for interacting with Claude AI processes
 */
export class ClaudeCodePlugin extends BasePlugin {
  private claudeConfig: ClaudeCodePluginConfig;

  constructor(config: PluginConfigWithContext) {
    super(config);
    // Validate and set plugin-specific config
    this.claudeConfig = validateConfig(config);

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

    this.addTool({
      name: "claude_send_command",
      description: "Send a command to a running Claude AI",
      parameters: z.object({
        command: z.string(),
      }),
      execute: this.sendCommand.bind(this),
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
    if (!sessionId) {
      return "No session ID provided";
    }

    if (!prompt) {
      return "No prompt provided";
    }

    try {
      const response = await execa(`claude -p ${prompt}`);

      return response;
    } catch (error) {
      console.error(
        `Error sending prompt to Claude session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  private async sendCommand(
    params: { command: string },
    context: Context<SessionContext>
  ): Promise<any> {
    const command = params.command as string;
    const sessionId = context.session?.id;

    if (!sessionId) {
      return "No session ID provided";
    }

    console.log("Sending command to Execa: %s", command);

    try {
      const { stdout } = await execa(command);

      console.log("Execa response: %s", stdout);

      return stdout;
    } catch (error) {
      console.error(
        `Error sending command to Claude session ${sessionId}:`,
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
  }
}
