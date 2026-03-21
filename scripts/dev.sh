#!/bin/bash

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

open_terminal() {
  local title="$1"
  local cmd="$2"

  osascript \
    -e 'tell application "Terminal"' \
    -e '  activate' \
    -e "  do script \"echo -e '\\\\033]0;$title\\\\007' && $cmd\"" \
    -e 'end tell'
}

if ! docker info &>/dev/null; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

open_terminal "api" "cd '$ROOT/api' && npm run start:dev"
open_terminal "web" "cd '$ROOT/web' && npm start"
