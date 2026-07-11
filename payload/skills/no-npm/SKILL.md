---
name: no-npm
description: Block npm/npx/yarn and suggest the pnpm equivalent. Triggers when a command uses npm/npx/yarn as a standalone word.
---

# no-npm — Block npm/npx/yarn, pnpm only

## Why this skill exists

The npm ecosystem went through a series of large supply-chain attacks
(Shai-Hulud Sep 2025, Shai-Hulud 2.0 Nov 2025, Mini Shai-Hulud May 2026).
The common vector across all three is a package's **lifecycle scripts**
(`preinstall` / `install` / `postinstall`), which the package manager runs
**automatically** during install. That is where the worm executes.

pnpm 10+ by default does **NOT** run dependency build scripts outside an
explicit allowlist (`onlyBuiltDependencies` / `allowBuilds` in
`pnpm-workspace.yaml`) — it only prints a warning. That closes the primary
vector. npm runs **everything** without asking — which is why npm is blocked
and pnpm is not.

> ✅ **Furthermore — pnpm 11+** (released ~April 2026) enables
> **`minimumReleaseAge=1440`** (a 24h cooldown on fresh versions) **and**
> **`blockExoticSubdeps`** by default. So on pnpm 11 both vectors are closed —
> execution (allowlist) and ingress (cooldown) — out of the box, no config.
> Before v11 the cooldown was `0` (opt-in). Source: <https://pnpm.io/settings>
> ("Default: 1440 (since v11)").
>
> ⚠️ `pnpm config get minimumReleaseAge` returning `undefined` does **NOT**
> mean "disabled": `config get` only echoes *explicit* config, not the v11
> built-in default.

The user's global decision: **no npm/npx/yarn in this environment.**

## When npm/npx/yarn appears (from me or from the user)

As soon as a command contains `npm`, `npx`, or `yarn` as a standalone word —
whether I (Claude) am about to run it or the user asks for it directly:

1. **Do NOT run it.**
2. Issue a warning:

   > **⛔ NPM IS BLOCKED IN THIS ENVIRONMENT. Use pnpm.**

3. Offer the pnpm equivalent (table below) and ask for confirmation before
   running it.

If the user genuinely needs npm itself, they run the command manually in their
own terminal outside Claude Code; the `block-npm.js` hook blocks the attempt
through Bash regardless.

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

### Security / maintenance (often forgotten, most useful)

| npm / npx / yarn | pnpm | Why |
|---|---|---|
| `npm i --ignore-scripts` | `pnpm install --ignore-scripts` | block **all** lifecycle scripts (even the allowlist) — the main Shai-Hulud defense |
| `npm audit` | `pnpm audit` | scan the dependency tree for vulnerabilities |
| `npm audit fix` | `pnpm audit --fix` | auto-bump vulnerable versions |
| `npm outdated` | `pnpm outdated` | which packages are stale |
| `npm ls <pkg>` / `npm explain` | `pnpm why <pkg>` | **who** pulled a dependency in (audit provenance) |
| `npm dedupe` | `pnpm dedupe` | collapse duplicates in the lockfile |
| `npm i -E <pkg>` | `pnpm add -E <pkg>` | pinned exact version (no `^`) |
| — (none) | `pnpm approve-builds` | interactive review — **which** package wants to run a build script, so you allowlist it consciously |

## Exclusions (do NOT block)

- `pnpm` itself (`pnpm` ≠ `npm` as a standalone word — the hook honors the word boundary).
- The word `npm` inside string literals in code (`"npm" in package.json`) —
  handled by the hook regex.
- Mentions of `npm` / `yarn` in markdown / comments / documentation.
- Commands where `npm` is part of another name: `npmlock`, `pnpm-install`, `unpm`, etc.

## Hardening — install scripts as the attack vector

The worm enters the system not through the mere act of `install`, but through a
package's **lifecycle script** that runs automatically. Three levels of defense
(from soft to paranoid):

1. **Default (already active).** pnpm 10+ does not run dependency build scripts
   outside the allowlist. In P1 CRM the allowlist is `pnpm-workspace.yaml →
   allowBuilds` (`core-js`, `esbuild`). A new package that wants a `postinstall`
   is skipped by default with a warning — and `pnpm approve-builds` shows who it
   is. **pnpm 11 added more defaults:** `blockExoticSubdeps` (blocks transitive
   deps from git/tarball sources) and `trustPolicy` (`no-downgrade` — won't
   install a package whose trust level dropped vs earlier releases). So pnpm 11
   is stricter out of the box than any manual npm flag.

2. **Cooldown — default ON in pnpm 11+.** Compromised releases are usually
   detected and pulled within hours. `minimumReleaseAge` won't install versions
   younger than N minutes. **pnpm 11 (Apr 2026) makes this a default: `1440`
   min = 24h.** Before v11 it was `0`. The user is on pnpm 11.2.2 → active out of
   the box.

   Pin it explicitly (makes it version-/downgrade-independent):
   `pnpm config set minimumReleaseAge 1440`. Disable: `minimumReleaseAge=0`.
   One-off bypass for a single package (e.g. a critical hotfix): `minimumReleaseAgeExclude`.

3. **`--ignore-scripts` (nuclear option).** One-off distrust of a specific
   install — blocks **all** scripts, including the allowlist and the project's
   own `prepare`/`postinstall`:

   ```
   pnpm install --ignore-scripts
   ```

   Downside: if the project genuinely needs a build step (esbuild), you run it
   manually. That's why it's not a default, but a conscious choice for a
   suspicious package.

The rule stands: **npm is fully blocked** (it runs scripts without asking).
pnpm is allowed because its default is safe; these levels are how to make it
even stricter when needed.

## Hard layer — `block-npm.js`

The hook `~/.claude/hooks/block-npm.js` is registered in `~/.claude/settings.json`
as a PreToolUse hook for Bash. It blocks with exit code 2 and an ANSI-bold
message. If I ever forget this instruction, the hook still catches it.

## How to disable the rule

In one specific case: the user runs the command themselves in their own terminal
(outside Claude Code), or temporarily comments out the hook in
`~/.claude/settings.json` (not recommended). This is a **global rule**, not tied
to a single project.
