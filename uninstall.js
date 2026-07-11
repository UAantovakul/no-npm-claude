#!/usr/bin/env node
// no-npm — single cross-platform uninstaller.
// Removes the hook entry from settings.json (other hooks untouched) and
// deletes the installed skill + hook. Leaves the pnpm cooldown in place.
//
//   node uninstall.js
//
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SKILL_DIR = path.join(CLAUDE_DIR, 'skills', 'no-npm');
const HOOK_FILE = path.join(CLAUDE_DIR, 'hooks', 'block-npm.js');
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');

console.log('\nno-npm uninstaller\n');

// [1/2] remove hook entry from settings.json ----------------------------------
if (fs.existsSync(SETTINGS)) {
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch (e) {
    console.error(`ERROR: cannot parse ${SETTINGS}: ${e.message}`);
    process.exit(1);
  }
  let removed = 0;
  const pre = settings.hooks && settings.hooks.PreToolUse;
  if (Array.isArray(pre)) {
    for (const entry of pre) {
      if (entry && entry.matcher === 'Bash' && Array.isArray(entry.hooks)) {
        const before = entry.hooks.length;
        entry.hooks = entry.hooks.filter((h) => !(h && typeof h.command === 'string' && h.command.includes('block-npm')));
        removed += before - entry.hooks.length;
      }
    }
  }
  if (removed > 0) {
    fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`[1/2] removed ${removed} block-npm entry/entries from settings.json`);
  } else {
    console.log('[1/2] no block-npm entry in settings.json — already clean');
  }
} else {
  console.log('[1/2] no settings.json — nothing to clean');
}

// [2/2] delete installed files ------------------------------------------------
if (fs.existsSync(SKILL_DIR)) {
  fs.rmSync(SKILL_DIR, { recursive: true, force: true });
  console.log(`[2/2] removed ${SKILL_DIR}`);
}
if (fs.existsSync(HOOK_FILE)) {
  fs.rmSync(HOOK_FILE, { force: true });
  console.log(`[2/2] removed ${HOOK_FILE}`);
}

console.log('\nDone. Restart Claude Code.');
console.log('Note: the pnpm cooldown (minimumReleaseAge) is left in place.');
console.log('      Remove it with:  pnpm config delete minimumReleaseAge\n');
