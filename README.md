# no-npm

> Block `npm`, `npx`, and `yarn` in Claude Code. Force `pnpm` instead. Defense against Shai-Hulud-style npm supply-chain attacks.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![Claude Code](https://img.shields.io/badge/Claude%20Code-skill%20%2B%20hook-purple)
![pnpm](https://img.shields.io/badge/package%20manager-pnpm%20only-orange)

A two-layer guard for [Claude Code](https://claude.com/claude-code) that
prevents any accidental `npm` / `npx` / `yarn` invocation and steers you
toward `pnpm`. Soft layer is a **skill** (instruction Claude reads); hard
layer is a **PreToolUse hook** that blocks the Bash call at the harness
level with `exit 2` and an ANSI-bold warning.

---

## Why

The npm ecosystem went through a chain of major supply-chain attacks:

- **Shai-Hulud** (Sep 2025) — first self-propagating worm, 500+ packages compromised
- **Shai-Hulud 2.0** (Nov 2025) — 700+ packages, 27 000+ malicious GitHub repos, 14 000 secrets exfiltrated
- **Mini Shai-Hulud** (May 2026) — 170+ npm packages + 2 PyPI packages
- **PackageGate** (Jan 2026) — six zero-days in npm / pnpm / vlt / Bun

Common vector: malicious code runs during the `preinstall` / `install` /
`postinstall` phase, **automatically**, **before** any tests or security
checks. This is exactly what `npm i --ignore-scripts` disables — and it is
why npm (which runs those scripts without asking) is the problem.

pnpm closes both vectors **by default** — and pnpm 11 (April 2026) turned the
cooldown on out of the box:

| pnpm behavior | Status | What it does |
|---|---|---|
| Dep build scripts blocked outside allowlist | **default (v10+)** | Lifecycle scripts of dependencies are **not** run unless the package is in `onlyBuiltDependencies` / `allowBuilds` (`pnpm-workspace.yaml`). Review pending ones with `pnpm approve-builds`. |
| `minimumReleaseAge: 1440` | **default (v11+)** | Won't install versions younger than 1440 min (24h) — malware is usually detected and pulled within hours. Was `0` (opt-in) before v11. Opt out with `minimumReleaseAge: 0`; bypass one package with `minimumReleaseAgeExclude`. |
| `blockExoticSubdeps` | **default (v11+)** | Blocks transitive deps pulled from git repos / tarball URLs. |
| `trustPolicy: no-downgrade` | **default (v11+)** | Won't install a package whose trust level dropped vs earlier releases. |
| `strictDepBuilds: true` | opt-in | Turns the skipped-build warning into a hard **error**. |
| `pnpm install --ignore-scripts` | manual | Nuclear option — blocks **all** scripts, including the allowlist. Use for a package you don't trust. |

> ℹ️ `pnpm config get minimumReleaseAge` returns `undefined` when you rely on
> the built-in v11 default — `config get` only echoes *explicit* config, not
> defaults. The cooldown is still active. Pin it explicitly (version-independent)
> with `pnpm config set minimumReleaseAge 1440`.
> Source: [pnpm settings](https://pnpm.io/settings) — *"Default: 1440 (since v11)"*.

This repo enforces "pnpm only" inside Claude Code, where the agent might
otherwise run `npm install` autonomously.

---

## Features

- **Skill** — `no-npm` is registered in Claude Code's skill list; the agent
  reads the instruction and refuses to run `npm` / `npx` / `yarn`, offering
  the `pnpm` equivalent instead.
- **PreToolUse hook** — Node.js script that inspects every `Bash` tool
  invocation; if the command word-matches `npm` / `npx` / `yarn`, it prints
  a bold ANSI-red banner and exits with code `2`, which the harness
  treats as "deny".
- **Idempotent installer** — re-running `node install.js` is safe; it does
  not duplicate the hook entry and leaves any other hooks (e.g.
  `block-destructive.js`) intact.
- **No false positives on `pnpm`** — word-boundary regex distinguishes
  `pnpm` from `npm` and `pnpx` from `npx`.

---

## Requirements

- **[Claude Code](https://claude.com/claude-code)** (CLI or VS Code extension)
- **Node.js ≥ 18 LTS** in `PATH` — the hook is a JS script; the installer
  uses `node` for JSON merging

```bash
node --version
```

---

## Install

One command, every platform (Windows / macOS / Linux):

```bash
git clone https://github.com/UAantovakul/no-npm-claude.git
cd no-npm-claude
node install.js
```

### What the installer does

1. Copies `SKILL.md` and `block-npm.js` into `~/.claude/skills/no-npm/`
   and `~/.claude/hooks/`.
2. Merges the hook entry into `~/.claude/settings.json` under
   `PreToolUse → Bash`. Idempotent — existing hooks are preserved, no
   duplicates on re-run.
3. Pins the pnpm cooldown `minimumReleaseAge=1440` (24h) explicitly — pnpm 11+
   already defaults this, but an explicit value is version-independent (survives
   a downgrade to pnpm 10). Only if pnpm is present and not already set; skipped
   silently if pnpm is missing.
4. Runs a smoke test (`npm install` must produce `exit 2`).

---

## Verify

Restart Claude Code, then in a new chat:

> "Run `npm install` in the current project."

Expected response — a warning in **bold** that looks like this:

> **⛔ NPM / NPX / YARN BLOCKED IN THIS ENVIRONMENT.**
> **USE pnpm INSTEAD.**
>
> Why: the npm ecosystem suffered a series of supply-chain attacks
> (Shai-Hulud 2025/2026). npm runs lifecycle scripts without asking;
> pnpm blocks dependency build scripts outside its allowlist by default.
>
> Blocked command: `npm install`
> Suggested replacement: `npm install → pnpm install`

If Claude tries to run `npm` as a Bash call anyway, the harness intercepts
it via the hook and prints the same banner to stderr with `exit 2`.

Manually test the hook:

```bash
echo '{"tool_input":{"command":"npm install"}}' | node ~/.claude/hooks/block-npm.js
echo $?    # should print 2
```

---

## Uninstall

```bash
node uninstall.js
```

Removes the hook entry from `settings.json` (other hooks untouched), then
deletes `~/.claude/skills/no-npm/` and `~/.claude/hooks/block-npm.js`. The
pnpm cooldown is left in place — remove it yourself if you want it gone:
`pnpm config delete minimumReleaseAge`.

---

## How it works

### The matching regex

```js
/(^|[\s;&|()`]|\$\()(npm|npx|yarn)(\s|$|[;&|`)])/
```

Word-boundary with Bash-aware separators: leading position, whitespace,
`;`, `&&`, `||`, `|`, `(`, `` ` ``, `$(`.

**Blocked:** `npm install`, `npm i react`, `npx vite`, `yarn add lodash`,
`sudo npm i -g foo`, `cd app && npm test`.

**Allowed:** `pnpm install`, `pnpm add react`, `pnpx whatever`,
`cat npmlock.txt`, `echo "npm is bad"`, `git log`.

### Hook contract

Claude Code's PreToolUse hook receives a JSON payload on stdin:

```json
{ "tool_input": { "command": "npm install" } }
```

The hook prints to **stderr** and uses **exit codes**:

- `exit 0` — allow the command (default for `pnpm`, `git`, etc.)
- `exit 2` — block the command; stderr is shown to the agent and the user

---

## Bundle layout

```
no-npm-claude/
├── README.md                       — this file
├── LICENSE                         — MIT
├── install.js                      — cross-platform installer (Node only)
├── uninstall.js                    — cross-platform uninstaller (Node only)
└── payload/
    ├── skills/no-npm/SKILL.md      — the skill
    └── hooks/block-npm.js          — the hook
```

---

## Integration with other LLM chat clients

The skill + hook only works inside Claude Code (it uses the skills API and
the PreToolUse hook contract). If you also use Claude (or another LLM) in
a different client, paste this rule into the system prompt / custom
instructions:

```text
HARD RULE: do not use npm, npx, or yarn in this environment. Always use pnpm.

If I (or the user) want to run an npm/npx/yarn command:
1. Do not execute the command.
2. Issue a warning in BOLD letters:
   **⛔ NPM IS BLOCKED IN THIS ENVIRONMENT. Use pnpm instead.**
3. Offer the pnpm equivalent:
   npm i                 -> pnpm install
   npm i <pkg>           -> pnpm add <pkg>
   npm run <s>           -> pnpm <s>
   npx <pkg>             -> pnpm dlx <pkg>
   yarn add <pkg>        -> pnpm add <pkg>
   npm i --ignore-scripts-> pnpm install --ignore-scripts
   npm audit             -> pnpm audit
4. Ask the user to confirm before running the pnpm variant.

Reason: a chain of npm supply-chain attacks (Shai-Hulud 2025-2026). The
vector is auto-run lifecycle scripts. npm runs them without asking; pnpm
blocks dependency build scripts outside its allowlist by default, and pnpm 11+
also defaults to a 24h version cooldown (minimumReleaseAge=1440) + blockExoticSubdeps.
```

Where to paste it:

- **Cursor** — Settings → Rules → User Rules, or `.cursorrules` in the repo root
- **Claude Desktop** — Settings → Custom Instructions
- **ChatGPT** — Settings → Personalization → Custom Instructions
- **VS Code Continue / Cline** — system prompt in the config
- **CLI agents (Codex CLI, Aider, etc.)** — `--system` flag or system file

---

## Bypassing the rule (intentional)

For one-off cases where `npm` is genuinely required (e.g. debugging an
incompatible tool):

1. **Recommended:** run the command in your own terminal outside Claude
   Code. The hook only intercepts the harness Bash channel.
2. **Temporary disable:** comment out the hook entry in
   `~/.claude/settings.json` (`PreToolUse → Bash → block-npm.js`), run
   the command, restore.

---

## Compatibility

- **Claude Code** — tested with releases that support the skills API and
  PreToolUse hooks (late 2025+).
- **Node.js** — ≥ 18 LTS (the hook uses only stdlib features).
- **OS** — Windows 10/11, macOS 12+, modern Linux distros.

The hook does **not** depend on Claude Code internals — it is a plain
JSON-stdin / stderr / exit-code contract, so it will keep working as
long as the PreToolUse hook contract is stable.

---

## Contributing

Issues and PRs welcome. Quick test for any regex change:

```bash
# should print 2 (blocked)
echo '{"tool_input":{"command":"npm install"}}' | node payload/hooks/block-npm.js; echo $?

# should print 0 (allowed)
echo '{"tool_input":{"command":"pnpm install"}}' | node payload/hooks/block-npm.js; echo $?
```

Keep the regex word-boundary intact — false positives on `pnpm`, `pnpx`,
`npmlock`, or string literals containing the word `npm` should never
occur.

---

## License

[MIT](./LICENSE)

---

## Related reading

- [pnpm — Mitigating supply chain attacks](https://pnpm.io/supply-chain-security)
- [pnpm 11.0 release — supply-chain protection on by default](https://pnpm.io/blog/releases/11.0) *(minimumReleaseAge=1440 + blockExoticSubdeps, April 2026)*
- [CISA — Widespread Supply Chain Compromise Impacting npm Ecosystem](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem)
- [Microsoft Security — Shai-Hulud 2.0](https://www.microsoft.com/en-us/security/blog/2025/12/09/shai-hulud-2-0-guidance-for-detecting-investigating-and-defending-against-the-supply-chain-attack/)
- [Palo Alto Unit 42 — "Shai-Hulud" Worm Compromises npm Ecosystem](https://unit42.paloaltonetworks.com/npm-supply-chain-attack/)
- [Anthropic — Claude Code documentation](https://code.claude.com/docs)

---
Maintained by [@UAantovakul](https://github.com/UAantovakul).