import { FastMCP } from "fastmcp";
import { BasePlugin } from "../base-plugin.js";
import { ProcessManager } from "../../services/process-manager.js";
import { PluginConfigWithProcessManager } from "../../types/plugin.types.js";
import { validateConfig, ClaudeCodePluginConfig } from "./config.js";
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
      name: "claude_start_session",
      description: "Start a new Claude AI session with specified parameters",
      parameters: z.object({
        model: z.string().optional(),
        apiKey: z.string().optional(),
      }),
      execute: this.startClaudeSession.bind(this),
    });

    this.addTool({
      name: "claude_stop_session",
      description: "Stop a running Claude AI session",
      parameters: z.object({
        sessionId: z.string(),
      }),
      execute: this.stopClaudeSession.bind(this),
    });

    this.addTool({
      name: "claude_list_sessions",
      description: "List all currently running Claude AI sessions",
      parameters: z.object({}),
      execute: this.listClaudeSessions.bind(this),
    });

    this.addTool({
      name: "claude_send_prompt",
      description: "Send a prompt to a running Claude AI session",
      parameters: z.object({
        sessionId: z.string(),
        prompt: z.string(),
      }),
      execute: this.sendPromptToClaudeSession.bind(this),
    });
  }

  /**
   * Start a new Claude AI session
   * @param params Tool parameters
   * @returns Session information
   */
  private async startClaudeSession(params: Record<string, any>): Promise<any> {
    const model = (params.model as string) || this.claudeConfig.defaultModel;
    const sessionId = crypto.randomUUID();

    try {
      // In a real implementation, this would start an actual Claude process
      // For now, we're just simulating it with the process manager

      // Check if API key is provided
      if (!this.claudeConfig.apiKey && !params.apiKey) {
        throw new Error("No Claude API key provided in config or parameters");
      }

      const apiKey = (params.apiKey as string) || this.claudeConfig.apiKey;

      // Command to run Claude (this is a placeholder - real implementation would use an actual Claude client)
      const command = "echo";
      const args = [`Simulating Claude ${model} session with ID: ${sessionId}`];

      // Start the process and get the managed process object
      const process = await this.processManager.startProcess(
        sessionId,
        command,
        args,
        {
          type: "claude",
          model,
          apiKey,
          status: "initialized",
        }
      );

      return {
        sessionId,
        model,
        status: "running",
        startTime: process.startTime,
      };
    } catch (error) {
      console.error("Error starting Claude session:", error);
      throw error;
    }
  }

  /**
   * Stop a running Claude AI session
   * @param params Tool parameters with sessionId
   * @returns Status of the operation
   */
  private async stopClaudeSession(params: Record<string, any>): Promise<any> {
    const sessionId = params.sessionId as string;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    try {
      const stopped = await this.processManager.stopProcess(sessionId);

      if (!stopped) {
        throw new Error(`No Claude session found with ID: ${sessionId}`);
      }

      return {
        sessionId,
        status: "stopped",
        message: `Claude session ${sessionId} has been stopped`,
      };
    } catch (error) {
      console.error(`Error stopping Claude session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * List all Claude AI sessions
   * @returns List of sessions
   */
  private async listClaudeSessions(): Promise<any> {
    try {
      const allProcesses = this.processManager.getAllProcesses();
      const claudeSessions = allProcesses.filter(
        (p) => p.metadata.type === "claude"
      );

      return {
        sessions: claudeSessions.map((p) => ({
          sessionId: p.id,
          model: p.metadata.model,
          status: p.status,
          startTime: p.startTime,
        })),
        count: claudeSessions.length,
      };
    } catch (error) {
      console.error("Error listing Claude sessions:", error);
      throw error;
    }
  }

  /**
   * Send a prompt to a running Claude AI session
   * @param params Tool parameters with sessionId and prompt
   * @returns Claude's response
   */
  private async sendPromptToClaudeSession(
    params: Record<string, any>
  ): Promise<any> {
    const sessionId = params.sessionId as string;
    const prompt = params.prompt as string;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    try {
      const process = this.processManager.getProcess(sessionId);

      if (!process || process.metadata.type !== "claude") {
        throw new Error(`No Claude session found with ID: ${sessionId}`);
      }

      if (process.status !== "running") {
        throw new Error(`Claude session ${sessionId} is not running`);
      }

      // In a real implementation, this would send the prompt to the Claude process
      // and return the response. For now, we're just simulating it.

      return {
        sessionId,
        response: `Simulated Claude response to: ${prompt}`,
        model: process.metadata.model,
        timestamp: new Date(),
      };
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
