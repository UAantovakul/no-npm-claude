#!/usr/bin/env node
// Removes the no-npm hook entry from ~/.claude/settings.json.
// Leaves other hooks (e.g. block-destructive) untouched.

const fs = require('fs');
const path = require('path');
const os = require('os');

const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

if (!fs.existsSync(SETTINGS)) {
  console.log('  - No settings.json - nothing to clean');
  process.exit(0);
}

let settings;
try {
  settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
} catch (e) {
  console.error(`ERROR: Cannot parse ${SETTINGS}: ${e.message}`);
  process.exit(1);
}

if (!settings.hooks || !Array.isArray(settings.hooks.PreToolUse)) {
  console.log('  - No PreToolUse hooks - nothing to clean');
  process.exit(0);
}

let removed = 0;
for (const entry of settings.hooks.PreToolUse) {
  if (entry && entry.matcher === 'Bash' && Array.isArray(entry.hooks)) {
    const before = entry.hooks.length;
    entry.hooks = entry.hooks.filter(h => !(h && typeof h.command === 'string' && h.command.includes('block-npm')));
    removed += before - entry.hooks.length;
  }
}

if (removed === 0) {
  console.log('  - Hook entry not found in settings.json - already clean');
} else {
  console.log(`  - Removed ${removed} block-npm hook entry/entries from settings.json`);
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}
