#!/usr/bin/env node
// Cross-platform installer for the no-npm hook entry in ~/.claude/settings.json
// Idempotent: safe to run multiple times.

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const HOOK_ABS = path.join(CLAUDE_DIR, 'hooks', 'block-npm.js');
// Forward slashes for portability across PowerShell/bash.
const HOOK_FORWARD = HOOK_ABS.split(path.sep).join('/');
const HOOK_CMD = `node "${HOOK_FORWARD}"`;

if (!fs.existsSync(CLAUDE_DIR)) {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
}

let settings = {};
if (fs.existsSync(SETTINGS)) {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch (e) {
    console.error(`ERROR: Cannot parse ${SETTINGS}: ${e.message}`);
    console.error('Fix the JSON manually, then re-run install.');
    process.exit(1);
  }
}

settings.hooks = settings.hooks || {};
settings.hooks.PreToolUse = settings.hooks.PreToolUse || [];

let bashEntry = settings.hooks.PreToolUse.find(e => e && e.matcher === 'Bash');
if (!bashEntry) {
  bashEntry = { matcher: 'Bash', hooks: [] };
  settings.hooks.PreToolUse.push(bashEntry);
}
bashEntry.hooks = bashEntry.hooks || [];

const exists = bashEntry.hooks.some(h => h && typeof h.command === 'string' && h.command.includes('block-npm'));
if (exists) {
  console.log('  - Hook already registered in settings.json - skipping merge');
} else {
  bashEntry.hooks.push({ type: 'command', command: HOOK_CMD });
  console.log('  - Hook added to settings.json PreToolUse -> Bash');
}

fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n', 'utf8');
console.log(`  - Wrote ${SETTINGS}`);
