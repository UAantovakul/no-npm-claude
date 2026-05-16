#!/usr/bin/env bash
# no-npm skill + hook - macOS / Linux installer
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo "=================================================="
echo " no-npm skill + hook - macOS/Linux installer"
echo "=================================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js not found in PATH." >&2
    echo "       Install from https://nodejs.org/ (LTS) or 'brew install node'," >&2
    echo "       then re-run this installer." >&2
    exit 1
fi

CLAUDE_DIR="$HOME/.claude"
SKILL_DIR="$CLAUDE_DIR/skills/no-npm"
HOOKS_DIR="$CLAUDE_DIR/hooks"

echo "[1/4] Creating directories"
mkdir -p "$SKILL_DIR" "$HOOKS_DIR"
echo "  - $SKILL_DIR"
echo "  - $HOOKS_DIR"

echo "[2/4] Copying files"
cp -f "$SCRIPT_DIR/payload/skills/no-npm/SKILL.md" "$SKILL_DIR/SKILL.md"
cp -f "$SCRIPT_DIR/payload/hooks/block-npm.js"    "$HOOKS_DIR/block-npm.js"
echo "  - $SKILL_DIR/SKILL.md"
echo "  - $HOOKS_DIR/block-npm.js"

echo "[3/4] Registering hook in settings.json"
node "$SCRIPT_DIR/install-hook.js"

echo "[4/4] Smoke test (verify the hook blocks 'npm install')"
set +e
echo '{"tool_input":{"command":"npm install"}}' | node "$HOOKS_DIR/block-npm.js" >/dev/null 2>&1
TEST_EXIT=$?
set -e
if [ "$TEST_EXIT" -eq 2 ]; then
    echo "  - OK: hook returned exit 2 (blocked npm install)"
else
    echo "  - WARN: hook returned exit $TEST_EXIT (expected 2)"
fi

echo ""
echo "=================================================="
echo " Done. Restart Claude Code so the skill is picked up."
echo "=================================================="
echo ""
echo "Verify after restarting Claude Code:"
echo "  Ask in chat: 'run npm install'"
echo "  Expected:    Claude replies with a BOLD warning and offers 'pnpm install'."
echo ""
echo "Uninstall:  bash uninstall.sh"
echo ""
