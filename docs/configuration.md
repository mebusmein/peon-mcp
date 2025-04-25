# Configuration Guide

Peon MCP offers a flexible configuration system with multiple ways to configure the application based on your needs. This guide explains how configuration works and the available options.

## Configuration Precedence

Peon MCP loads configuration from multiple sources, with the following precedence (highest to lowest):

1. **Command Line Arguments**: Highest priority, override all other settings.
2. **Environment Variables**: Override file-based settings but can be overridden by command line.
3. **Configuration Files**: The main way to configure the application.
   - `.env.local` - Local environment overrides
   - `.env.{environment}` - Environment-specific settings
   - `.env` - Base environment variables
   - `config.local.json` - Local configuration overrides
   - `config.{environment}.json` - Environment-specific configuration
   - `config.json` - Base configuration
4. **Default Values**: Used when no configuration is provided.

## Configuration Options

### Core Settings

| Option               | Type                                       | Default       | Description                          |
| -------------------- | ------------------------------------------ | ------------- | ------------------------------------ |
| `core.port`          | number                                     | 3000          | Port number for the server           |
| `core.host`          | string                                     | "localhost"   | Hostname to bind the server to       |
| `core.transportType` | "sse" \| "stdio"                           | "sse"         | Transport type for MCP communication |
| `core.env`           | "development" \| "staging" \| "production" | "development" | Runtime environment                  |

### Logging Settings

| Option                  | Type                                   | Default   | Description                         |
| ----------------------- | -------------------------------------- | --------- | ----------------------------------- |
| `logging.level`         | "ERROR" \| "WARN" \| "INFO" \| "DEBUG" | "INFO"    | Log level                           |
| `logging.prefix`        | string                                 | ""        | Default log prefix                  |
| `logging.timestamp`     | "iso" \| "unix" \| "none"              | "iso"     | Timestamp format for logs           |
| `logging.file.path`     | string                                 | "./logs/" | Directory for log files             |
| `logging.file.maxSize`  | number                                 | 10485760  | Maximum file size in bytes (10MB)   |
| `logging.file.maxFiles` | number                                 | 5         | Maximum number of log files to keep |

### Process Manager Settings

| Option                           | Type   | Default | Description                            |
| -------------------------------- | ------ | ------- | -------------------------------------- |
| `processManager.maxProcesses`    | number | 10      | Maximum number of concurrent processes |
| `processManager.checkIntervalMs` | number | 5000    | Process check interval in milliseconds |

### Plugin Settings

Plugin settings are stored under the `plugins` key, with each plugin having its own configuration object. All plugins share some common settings:

| Option                       | Type    | Default | Description                   |
| ---------------------------- | ------- | ------- | ----------------------------- |
| `plugins.<name>.enabled`     | boolean | true    | Whether the plugin is enabled |
| `plugins.<name>.description` | string  | -       | Description of the plugin     |

Each plugin can have additional configuration options specific to its functionality.

## Configuration Methods

### 1. Configuration Files

The main configuration file is `config.json` in the project root. You can also use environment-specific configurations:

- `config.json` - Base configuration
- `config.development.json` - Development environment configuration
- `config.production.json` - Production environment configuration
- `config.local.json` - Local overrides (git-ignored)

Example:

```json
{
  "core": {
    "port": 3000,
    "host": "localhost",
    "transportType": "sse",
    "env": "development"
  },
  "logging": {
    "level": "DEBUG",
    "timestamp": "iso",
    "file": {
      "path": "./logs/",
      "maxSize": 10485760,
      "maxFiles": 5
    }
  },
  "processManager": {
    "maxProcesses": 10,
    "checkIntervalMs": 5000
  },
  "plugins": {
    "claudeCode": {
      "enabled": true,
      "description": "Plugin for interacting with Claude AI",
      "defaultModel": "claude-3-sonnet-20240229"
    }
  }
}
```

### 2. Environment Variables

Environment variables can be set directly or using `.env` files:

- `.env` - Base environment variables
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables
- `.env.local` - Local overrides (git-ignored)

Environment variables use the `PEON_` prefix and underscore notation:

```
PEON_CORE_PORT=3000
PEON_CORE_HOST=localhost
PEON_LOGGING_LEVEL=INFO
PEON_PROCESS_MANAGER_MAX_PROCESSES=10
PEON_PLUGINS_CLAUDE_CODE_ENABLED=true
```

### 3. Command Line Arguments

Command line arguments use dot notation with double dash prefix:

```bash
node dist/index.js --core.port=3001 --logging.level=DEBUG --core.transportType=stdio
```

You can also use the shorthand `--stdio` flag for setting the transport type:

```bash
node dist/index.js --stdio
```

For help with command line options:

```bash
node dist/index.js --help
```

## Plugin Configuration

Plugin configurations are isolated from each other and can be loaded from separate directories. Each plugin has its own configuration schema and validation.

The plugin configuration structure:

```
/plugins
  /plugin-name
    /config.json
    /config.development.json
    /config.local.json
```

## API for Configuration Consumers

If you're developing a plugin or component that needs configuration, you can use the configuration API:

```typescript
import { getConfig, Config } from "./config";

// Get the entire configuration
const config: Config = getConfig();

// Access specific settings
const port = config.core.port;
const maxProcesses = config.processManager.maxProcesses;

// Access plugin-specific configuration
const pluginConfig = config.plugins.myPlugin;
```

For reacting to configuration changes:

```typescript
import { getConfigManager } from "./config";

const configManager = getConfigManager();

// Subscribe to configuration changes
configManager.on("change", (changes) => {
  for (const change of changes) {
    console.log(
      `${change.path} changed from ${change.oldValue} to ${change.newValue}`
    );
  }
});

// Reload configuration
await configManager.reload();
```

## Debugging Configuration

To help debug configuration issues, you can examine the configuration sources:

```typescript
import { getConfigManager } from "./config";

const configManager = getConfigManager();
const metadata = configManager.getMetadata();

// Check where a specific setting came from
const portSource = configManager.getSourceForPath("core.port");
console.log(`Port was set from: ${portSource}`); // CLI, ENV, FILE, or DEFAULT
```

This information can help identify how configuration values are being set and which sources take precedence in your environment.
