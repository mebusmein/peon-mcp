#!/bin/bash

# Build and run the Peon MCP server

# Check if we should build
BUILD=true
if [[ "$*" == *"--no-build"* ]]; then
  BUILD=false
fi

# Check for dev mode
DEV=false
if [[ "$*" == *"--dev"* ]]; then
  DEV=true
fi

# Check for stdio transport
STDIO=""
if [[ "$*" == *"--stdio"* ]]; then
  STDIO="-- --stdio"
fi

# Build the project if needed
if [[ "$BUILD" == "true" ]]; then
  echo "Building the project..."
  npm run build
fi

# Run the server
if [[ "$DEV" == "true" ]]; then
  echo "Starting in development mode..."
  if [[ -n "$STDIO" ]]; then
    echo "Using stdio transport..."
    npm run dev $STDIO
  else
    npm run dev
  fi
else
  echo "Starting in production mode..."
  if [[ -n "$STDIO" ]]; then
    echo "Using stdio transport..."
    npm start $STDIO
  else
    npm start
  fi
fi 