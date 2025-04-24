#!/bin/bash

# Build and run the Peon MCP server

# Check if we should build
BUILD=true
if [[ "$1" == "--no-build" ]]; then
  BUILD=false
  shift
fi

# Check for dev mode
DEV=false
if [[ "$1" == "--dev" ]]; then
  DEV=true
  shift
fi

# Build the project if needed
if [[ "$BUILD" == "true" ]]; then
  echo "Building the project..."
  npm run build
fi

# Run the server
if [[ "$DEV" == "true" ]]; then
  echo "Starting in development mode..."
  npm run dev
else
  echo "Starting in production mode..."
  npm start
fi 