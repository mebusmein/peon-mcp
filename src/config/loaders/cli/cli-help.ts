import { z } from "zod";
import { flatten } from "../utils/object-utils.js";
import { ConfigSchema } from "../../schemas/index.js";

/**
 * Option metadata extracted from schema
 */
interface OptionMetadata {
  path: string;
  type: string;
  description: string;
  default?: any;
  isRequired: boolean;
}

/**
 * CLI help generator that uses schema descriptions
 */
export class CliHelpGenerator {
  private schema: z.ZodObject<any>;
  private programName: string;

  constructor(
    schema: z.ZodObject<any> = ConfigSchema,
    programName: string = "peon-mcp"
  ) {
    this.schema = schema;
    this.programName = programName;
  }

  /**
   * Generate help text from schema
   */
  public generateHelp(): string {
    const options = this.extractOptions();

    // Sort options by path
    options.sort((a, b) => a.path.localeCompare(b.path));

    const sections = [
      this.generateHeader(),
      this.generateUsage(),
      this.generateOptionsSection(options),
    ];

    return sections.join("\n\n");
  }

  /**
   * Print help to console
   */
  public printHelp(): void {
    console.log(this.generateHelp());
  }

  /**
   * Generate header section
   */
  private generateHeader(): string {
    return `${this.programName} - Modular MCP server`;
  }

  /**
   * Generate usage section
   */
  private generateUsage(): string {
    return ["Usage:", `  node ${this.programName} [options]`].join("\n");
  }

  /**
   * Generate options section
   */
  private generateOptionsSection(options: OptionMetadata[]): string {
    if (options.length === 0) {
      return "Options: None";
    }

    const rows = options.map((option) => {
      const defaultValue =
        option.default !== undefined
          ? ` (default: ${JSON.stringify(option.default)})`
          : "";

      const required = option.isRequired ? " (required)" : "";

      return `  --${option.path.padEnd(20)} ${
        option.description
      }${defaultValue}${required}`;
    });

    return ["Options:", ...rows].join("\n");
  }

  /**
   * Extract option metadata from schema
   */
  private extractOptions(): OptionMetadata[] {
    const options: OptionMetadata[] = [];

    const extractFromSchema = (
      schema: z.ZodTypeAny,
      path: string = "",
      parentDescription: string = ""
    ) => {
      // Check if schema has a shape property (is an object schema)
      if (!schema || !this.hasShape(schema)) {
        return;
      }

      // Extract description from schema
      const schemaDescription =
        (schema as any).description || parentDescription;

      // Process each property in the schema
      Object.entries(this.getShape(schema)).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        const zodType = value as z.ZodTypeAny;

        // Get property metadata
        const description = (zodType as any).description || schemaDescription;
        const defaultValue = this.getDefaultValue(zodType);
        const isRequired = !zodType.isOptional();

        if (this.isLeafNode(zodType)) {
          // Add leaf node to options
          options.push({
            path: currentPath,
            type: this.getTypeName(zodType),
            description,
            default: defaultValue,
            isRequired,
          });
        } else if (zodType instanceof z.ZodObject) {
          // Recurse into nested object
          extractFromSchema(zodType, currentPath, description);
        }
      });
    };

    extractFromSchema(this.schema);
    return options;
  }

  /**
   * Check if a schema type is a leaf node (not an object)
   */
  private isLeafNode(type: z.ZodTypeAny): boolean {
    return (
      !(type instanceof z.ZodObject) ||
      !this.hasShape(type) ||
      Object.keys(this.getShape(type)).length === 0
    );
  }

  /**
   * Check if a schema has a shape property
   */
  private hasShape(schema: z.ZodTypeAny): boolean {
    return schema instanceof z.ZodObject && (schema as any).shape !== undefined;
  }

  /**
   * Get shape from schema safely
   */
  private getShape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
    if (schema instanceof z.ZodObject) {
      return (schema as any).shape || {};
    }
    return {};
  }

  /**
   * Get default value from schema
   */
  private getDefaultValue(type: z.ZodTypeAny): any {
    // Access internal default value
    const defaultValue = (type as any)._def?.defaultValue?.();
    return defaultValue;
  }

  /**
   * Get type name from schema
   */
  private getTypeName(type: z.ZodTypeAny): string {
    if (type instanceof z.ZodString) return "string";
    if (type instanceof z.ZodNumber) return "number";
    if (type instanceof z.ZodBoolean) return "boolean";
    if (type instanceof z.ZodEnum) return "enum";
    if (type instanceof z.ZodArray) return "array";
    if (type instanceof z.ZodObject) return "object";
    return "unknown";
  }
}
