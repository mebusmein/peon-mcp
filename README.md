# Peon MCP

Peon-MCP is a modular MCP (Model Context Protocol) server that can be used to expose an AI-enhanced workspace.

## Features

- Modular plugin architecture
- Process management for long-running operations
- Configuration via JSON files and environment variables
- Built-in plugins for:
  - Claude AI - Start and manage Claude AI sessions
  - Git - Execute git operations with template support
  - NPM - Execute npm commands with security controls

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/peon-mcp.git
cd peon-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Configure the server using `config.json` in the project root or environment variables.

### Environment Variables

- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: localhost)
- `MAX_PROCESSES`: Maximum number of processes (default: 10)
- `CLAUDE_API_KEY`: API key for Claude AI
- `CLAUDE_MODEL`: Model to use for Claude AI (default: claude-3-sonnet-20240229)
- `CONFIG_PATH`: Custom path to config file (default: ./config.json)

## Usage

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start

# Or use the run script
./run.sh        # Build and run in production mode
./run.sh --dev  # Run in development mode
./run.sh --no-build  # Run without building
```

## Available Tools

### Claude Code Plugin

- `claude_start_session`: Start a new Claude AI session
- `claude_stop_session`: Stop a running Claude AI session
- `claude_list_sessions`: List all running Claude AI sessions
- `claude_send_prompt`: Send a prompt to a Claude AI session

### Git Plugin

- `git_execute`: Execute a git command
- `git_create_branch`: Create a new git branch with optional template
- `git_commit`: Commit changes with a message
- `git_push`: Push changes to remote repository

### NPM Plugin

- `npm_execute`: Execute an npm command
- `npm_install`: Install npm packages
- `npm_run`: Run an npm script
- `npm_list_running`: List running npm processes
- `npm_stop_process`: Stop a running npm process

## Creating New Plugins

1. Create a new directory for your plugin in `src/plugins/`
2. Create a plugin class that extends `BasePlugin`
3. Add configuration schema in `src/types/config.types.ts`
4. Register your plugin in the PluginManager

## License

ISC
