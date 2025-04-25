import { z } from "zod";
import { ConfigSchema } from "../../schemas/index.js";
import type { Config } from "../../types/config.js";

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError,
    public schema: z.ZodType<any>
  ) {
    super(message);
    this.name = "ValidationError";
  }

  /**
   * Format error messages with schema descriptions
   */
  public formatErrors(): string[] {
    return this.errors.errors.map((error) => {
      const path = error.path.join(".");
      const message = error.message;
      const description = this.getSchemaDescription(error.path);

      return `${path}: ${message}${description ? ` (${description})` : ""}`;
    });
  }

  /**
   * Get schema description for a specific path
   */
  private getSchemaDescription(path: (string | number)[]): string | undefined {
    let currentSchema: any = this.schema;
    let description: string | undefined;

    // Try to find the description for this path
    for (const segment of path) {
      if (!currentSchema) return undefined;

      if (currentSchema.description) {
        description = currentSchema.description;
      }

      // Navigate to the next level in the schema
      if (
        typeof currentSchema.shape === "object" &&
        currentSchema.shape[segment]
      ) {
        currentSchema = currentSchema.shape[segment];
      } else {
        return description;
      }
    }

    return currentSchema?.description || description;
  }
}

export class ZodValidator {
  /**
   * Validate configuration against schema
   * @param config Configuration to validate
   * @throws ValidationError if validation fails
   */
  public static validate(config: Partial<Config>): Config {
    try {
      return ConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "Configuration validation failed",
          error,
          ConfigSchema
        );
      }
      throw error;
    }
  }

  /**
   * Safely validate configuration without throwing
   * @param config Configuration to validate
   */
  public static safeParse(config: Partial<Config>): {
    success: boolean;
    data?: Config;
    error?: ValidationError;
  } {
    const result = ConfigSchema.safeParse(config);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    return {
      success: false,
      error: new ValidationError(
        "Configuration validation failed",
        result.error,
        ConfigSchema
      ),
    };
  }
}
