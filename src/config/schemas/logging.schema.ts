import { z } from "zod";

export const LoggingSchema = z
  .object({
    level: z
      .enum(["ERROR", "WARN", "INFO", "DEBUG"])
      .default("INFO")
      .describe("Log level"),
    prefix: z.string().default("").describe("Default log prefix"),
    timestamp: z
      .enum(["iso", "unix", "none"])
      .default("iso")
      .describe("Timestamp format for logs"),
    file: z
      .object({
        path: z
          .string()
          .default("./logs/")
          .describe("Directory path for log files"),
        maxSize: z
          .number()
          .positive()
          .default(10 * 1024 * 1024) // 10MB
          .describe("Maximum size of log files in bytes"),
        maxFiles: z
          .number()
          .int()
          .positive()
          .default(5)
          .describe("Maximum number of log files to keep"),
      })
      .describe("File logging configuration"),
  })
  .describe("Logging configuration");

export type LoggingConfig = z.infer<typeof LoggingSchema>;
