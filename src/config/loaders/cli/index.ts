import { CliParser } from "./cli-parser.js";
import { CliHelpGenerator } from "./cli-help.js";
import type { Config} from "../../types/config.js";
import { CONFIG_SOURCES } from "../../types/config.js";

/**
 * Load configuration from command line arguments
 * @returns Partial configuration
 */
export function loadFromCommandLine(): Partial<Config> {
  const parser = new CliParser();
  return parser.parse();
}

/**
 * Generate and print help text
 */
export function printHelp(): void {
  const generator = new CliHelpGenerator();
  generator.printHelp();
}

/**
 * Check if help flag is present
 * @returns Whether help flag is present
 */
export function isHelpRequested(): boolean {
  const args = process.argv.slice(2);
  return args.includes("--help") || args.includes("-h");
}

export { CliParser, CliHelpGenerator };
