#!/usr/bin/env node
// no-npm — single cross-platform installer (skill + hook + pnpm cooldown).
// Idempotent: safe to run multiple times. Requires only Node.js (>= 18).
//
//   node install.js
//
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SKILL_DIR = path.join(CLAUDE_DIR, 'skills', 'no-npm');
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks');
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const HOOK_DST = path.join(HOOKS_DIR, 'block-npm.js');
const COOLDOWN_MIN = 1440; // 24h — delay installing fresh (possibly compromised) versions

console.log('\nno-npm installer\n');

// [1/4] copy skill + hook -----------------------------------------------------
fs.mkdirSync(SKILL_DIR, { recursive: true });
fs.mkdirSync(HOOKS_DIR, { recursive: true });
fs.copyFileSync(path.join(HERE, 'payload', 'skills', 'no-npm', 'SKILL.md'), path.join(SKILL_DIR, 'SKILL.md'));
fs.copyFileSync(path.join(HERE, 'payload', 'hooks', 'block-npm.js'), HOOK_DST);
console.log('[1/4] copied skill + hook to ~/.claude');

// [2/4] register hook in settings.json (idempotent, preserves other hooks) -----
let settings = {};
if (fs.existsSync(SETTINGS)) {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch (e) {
    console.error(`ERROR: cannot parse ${SETTINGS}: ${e.message}`);
    console.error('Fix the JSON manually, then re-run.');
    process.exit(1);
  }
}
settings.hooks = settings.hooks || {};
settings.hooks.PreToolUse = settings.hooks.PreToolUse || [];
let bash = settings.hooks.PreToolUse.find((e) => e && e.matcher === 'Bash');
if (!bash) {
  bash = { matcher: 'Bash', hooks: [] };
  settings.hooks.PreToolUse.push(bash);
}
bash.hooks = bash.hooks || [];
const cmd = `node "${HOOK_DST.split(path.sep).join('/')}"`;
if (bash.hooks.some((h) => h && typeof h.command === 'string' && h.command.includes('block-npm'))) {
  console.log('[2/4] hook already registered in settings.json — skipped');
} else {
  bash.hooks.push({ type: 'command', command: cmd });
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  console.log('[2/4] hook registered in settings.json (PreToolUse -> Bash)');
}

// [3/4] pnpm cooldown — best-effort, respects an existing value ----------------
// Pass the command as a single shell string (no args array) to avoid Node's
// DEP0190 warning; every argument here is a fixed constant, so nothing to escape.
const pnpm = (argStr) => spawnSync(`pnpm ${argStr}`, { shell: true, encoding: 'utf8' });
if (pnpm('--version').status !== 0) {
  console.log('[3/4] pnpm not found — skipped cooldown. After installing pnpm, run:');
  console.log(`        pnpm config set minimumReleaseAge ${COOLDOWN_MIN}`);
} else {
  const cur = (pnpm('config get minimumReleaseAge').stdout || '').trim();
  if (cur && cur !== 'undefined') {
    console.log(`[3/4] pnpm cooldown already set (minimumReleaseAge=${cur}) — left as is`);
  } else {
    const set = pnpm(`config set minimumReleaseAge ${COOLDOWN_MIN}`);
    console.log(
      set.status === 0
        ? `[3/4] pnpm cooldown set (minimumReleaseAge=${COOLDOWN_MIN} = 24h)`
        : `[3/4] WARN: could not set cooldown — run 'pnpm config set minimumReleaseAge ${COOLDOWN_MIN}' manually`
    );
  }
}

// [4/4] smoke test — the installed hook must block 'npm install' with exit 2 ---
const smoke = spawnSync(process.execPath, [HOOK_DST], {
  input: JSON.stringify({ tool_input: { command: 'npm install' } }),
  encoding: 'utf8',
});
console.log(
  smoke.status === 2
    ? '[4/4] smoke test OK — hook blocks npm install (exit 2)'
    : `[4/4] WARN: smoke test returned exit ${smoke.status} (expected 2)`
);

console.log('\nDone. Restart Claude Code so the skill is picked up.');
console.log('Uninstall:  node uninstall.js\n');
