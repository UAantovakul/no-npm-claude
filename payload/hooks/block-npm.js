const fs = require('fs');

const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const cmd = (input.tool_input && input.tool_input.command) || '';

  // Word-boundary regex: matches npm/npx/yarn as a standalone word.
  // Does NOT match pnpm, pnpx, npmlock, yarnpkg-foo, etc.
  // Allows at line start, after whitespace, ;, &&, ||, |, (, $(, newline.
  const NPM_RE = /(^|[\s;&|()`]|\$\()(npm|npx|yarn)(\s|$|[;&|`)])/;

  const match = cmd.match(NPM_RE);
  if (!match) {
    process.exit(0);
  }

  const tool = match[2];

  const suggestions = {
    'npm install': 'pnpm install',
    'npm i': 'pnpm install',
    'npm ci': 'pnpm install --frozen-lockfile',
    'npm run': 'pnpm <script>  (or pnpm run <script>)',
    'npm test': 'pnpm test',
    'npm uninstall': 'pnpm remove',
    'npm rm': 'pnpm remove',
    'npm update': 'pnpm update',
    'npx': 'pnpm dlx',
    'yarn': 'pnpm',
    'yarn add': 'pnpm add',
    'yarn remove': 'pnpm remove',
    'yarn install': 'pnpm install',
  };

  let suggestion = null;
  for (const [key, val] of Object.entries(suggestions)) {
    if (cmd.includes(key)) {
      suggestion = `${key}  →  ${val}`;
      break;
    }
  }
  if (!suggestion) {
    suggestion = `${tool} <...>  →  pnpm <...>`;
  }

  const banner = [
    '',
    `${BOLD}${RED}⛔ NPM / NPX / YARN IS BLOCKED IN THIS ENVIRONMENT.${RESET}`,
    `${BOLD}${RED}   USE pnpm INSTEAD.${RESET}`,
    '',
    `${BOLD}Why:${RESET} the npm ecosystem suffered a series of supply-chain attacks (Shai-Hulud 2025/2026).`,
    `      npm runs lifecycle scripts without asking; pnpm blocks dependency build`,
    `      scripts outside its allowlist by default, and pnpm 11+ also defaults to a`,
    `      24h cooldown (minimumReleaseAge=1440) + blockExoticSubdeps.`,
    '',
    `${BOLD}${YELLOW}Blocked command:${RESET}`,
    `   ${cmd}`,
    '',
    `${BOLD}${YELLOW}Suggested replacement:${RESET}`,
    `   ${suggestion}`,
    '',
    `${BOLD}To bypass:${RESET} run the command in your own terminal outside Claude Code,`,
    `   or temporarily disable the hook in ~/.claude/settings.json (not recommended).`,
    '',
  ].join('\n');

  console.error(banner);
  process.exit(2);
} catch (e) {
  process.exit(0);
}
