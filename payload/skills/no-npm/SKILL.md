---
name: no-npm
description: |
  Block every `npm`, `npx`, and `yarn` Bash/PowerShell invocation in Claude Code.
  If the user (or Claude itself) tries to run an npm-family command, issue a
  warning in BOLD letters and suggest the pnpm equivalent. This skill is the
  soft layer that pairs with the hard PreToolUse hook `block-npm.js`, which
  blocks the command at the harness level.
  Triggers: any command starting with `npm`, `npx`, or `yarn` as a standalone word.
---

# no-npm — block npm/npx/yarn, pnpm only

## Why this skill exists

The npm ecosystem went through a series of major supply-chain attacks
(Shai-Hulud Sep 2025, Shai-Hulud 2.0 Nov 2025, Mini Shai-Hulud May 2026,
PackageGate Jan 2026). pnpm v11+ blocks lifecycle scripts by default
(`strictDepBuilds`) and delays installation of fresh versions by 24 hours
(`minimumReleaseAge: 1440`) — that closes the primary attack vectors.

Global user decision: **no npm/npx/yarn in this environment**.

## What to do when you see npm/npx/yarn in planning

**Before running Bash/PowerShell** — if I (Claude) am about to run a command
containing `npm`, `npx`, or `yarn` as a standalone word:

1. **Do not run it.**
2. Emit a warning to the user in this shape:

   > **⛔ NPM IS BLOCKED IN THIS ENVIRONMENT.**
   > **Use pnpm instead.**

3. Offer the pnpm equivalent and ask for confirmation before running.

## If the request came from the user

If the user types something like "run `npm install`":

1. Do not execute the command directly.
2. Respond with a bold warning and the pnpm equivalent.
3. Ask: should I run the pnpm variant, or do you really need npm
   specifically? (In that case the user must run the command manually in
   their own terminal — the hook will block it via Bash either way.)

## Equivalents table

| npm / npx / yarn | pnpm |
|---|---|
| `npm install` / `npm i` | `pnpm install` |
| `npm install <pkg>` / `npm i <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm install -g <pkg>` | `pnpm add -g <pkg>` |
| `npm uninstall <pkg>` / `npm rm <pkg>` | `pnpm remove <pkg>` |
| `npm update` | `pnpm update` |
| `npm run <script>` | `pnpm <script>` (or `pnpm run <script>`) |
| `npm test` | `pnpm test` |
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npx <pkg>` | `pnpm dlx <pkg>` |
| `npx create-vite my-app` | `pnpm create vite my-app` |
| `yarn` / `yarn install` | `pnpm install` |
| `yarn add <pkg>` | `pnpm add <pkg>` |
| `yarn add -D <pkg>` | `pnpm add -D <pkg>` |
| `yarn remove <pkg>` | `pnpm remove <pkg>` |
| `yarn <script>` | `pnpm <script>` |

## Exclusions (do NOT block)

- `pnpm` itself (the word-boundary regex distinguishes `pnpm` from `npm`).
- The word `npm` inside string literals in source code (e.g. `"npm" in
  package.json`) — handled at the regex layer.
- Mentions of `npm` / `yarn` in markdown / comments / documentation.
- Commands where `npm` is a substring of another identifier: `npmlock`,
  `pnpm-install`, `unpm`, etc.

## Hard layer — `block-npm.js`

The hook at `~/.claude/hooks/block-npm.js` is registered in
`~/.claude/settings.json` as a PreToolUse handler for `Bash`. It blocks the
invocation with `exit 2` and an ANSI-bold message. If I ever forget this
instruction, the hook will still catch the call.

## Disabling the rule

If you need to run npm in one specific case:
1. Run the command in your own terminal (outside Claude Code).
2. Or temporarily comment out the hook in `~/.claude/settings.json` (not
   recommended).

This is a **global** rule, not tied to a single project.
