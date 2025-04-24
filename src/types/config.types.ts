import { z } from "zod";

// Process Manager configuration schema
export const ProcessManagerConfigSchema = z.object({
  maxProcesses: z.number().positive().default(10),
  checkIntervalMs: z.number().positive().default(5000),
});

// Server configuration schema
export const ServerConfigSchema = z.object({
  port: z.number().positive().default(3000),
  host: z.string().default("localhost"),
  processManager: ProcessManagerConfigSchema.default({}),
  plugins: z.record(z.string(), z.unknown()).default({}),
});

export type ProcessManagerConfig = z.infer<typeof ProcessManagerConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
