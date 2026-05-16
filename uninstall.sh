#!/usr/bin/env bash
# no-npm skill + hook - macOS / Linux uninstaller
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo "=================================================="
echo " no-npm skill + hook - macOS/Linux uninstaller"
echo "=================================================="
echo ""

CLAUDE_DIR="$HOME/.claude"
SKILL_DIR="$CLAUDE_DIR/skills/no-npm"
HOOK_FILE="$CLAUDE_DIR/hooks/block-npm.js"

echo "[1/2] Removing hook entry from settings.json"
if ! command -v node >/dev/null 2>&1; then
    echo "  - WARN: Node.js not found - settings.json not updated."
    echo "          Remove the block-npm.js entry from PreToolUse manually."
else
    node "$SCRIPT_DIR/uninstall-hook.js"
fi

echo "[2/2] Removing files"
if [ -d "$SKILL_DIR" ]; then rm -rf "$SKILL_DIR"; echo "  - removed $SKILL_DIR"; fi
if [ -f "$HOOK_FILE" ]; then rm -f "$HOOK_FILE"; echo "  - removed $HOOK_FILE"; fi

echo ""
echo "Done. Restart Claude Code."
echo ""
