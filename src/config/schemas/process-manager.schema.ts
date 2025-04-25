import { z } from "zod";

export const ProcessManagerSchema = z
  .object({
    maxProcesses: z
      .number()
      .int()
      .positive()
      .default(10)
      .describe("Maximum number of concurrent processes"),
    checkIntervalMs: z
      .number()
      .int()
      .positive()
      .default(5000)
      .describe("Process check interval in milliseconds"),
  })
  .describe("Process manager configuration");

export type ProcessManagerConfig = z.infer<typeof ProcessManagerSchema>;
