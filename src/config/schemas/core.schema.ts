import { z } from "zod";

export const CoreSchema = z
  .object({
    port: z.number().positive().default(3000).describe("Main application port"),
    host: z
      .string()
      .default("localhost")
      .describe("Host to bind the server to"),
    transportType: z
      .enum(["sse", "stdio"])
      .default("sse")
      .describe("Transport type for MCP communication"),
    env: z
      .enum(["development", "staging", "production"])
      .default("development")
      .describe("Runtime environment"),
  })
  .describe("Core application configuration");

export type CoreConfig = z.infer<typeof CoreSchema>;
