const fs = require('fs');

const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const cmd = (input.tool_input && input.tool_input.command) || '';

  // Word-boundary regex: ловить npm/npx/yarn як окреме слово.
  // Не ловить pnpm, pnpx, npmlock, yarnpkg-foo тощо.
  // Дозволяє на початку рядка, після пробілу, ;, &&, ||, |, (, $(, новий рядок.
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
    'npm run': 'pnpm <script>  (або pnpm run <script>)',
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
    `${BOLD}${RED}⛔ NPM / NPX / YARN ЗАБОРОНЕНО У ЦЬОМУ ОТОЧЕННІ.${RESET}`,
    `${BOLD}${RED}   ВИКОРИСТОВУЙ pnpm.${RESET}`,
    '',
    `${BOLD}Чому:${RESET} npm-екосистема пройшла серію supply-chain атак (Shai-Hulud 2025/2026).`,
    `      npm запускає lifecycle-скрипти без питань; pnpm за замовчуванням блокує`,
    `      build-скрипти поза allowlist, а pnpm 11+ ще й дефолтить 24-год cooldown`,
    `      (minimumReleaseAge=1440) + blockExoticSubdeps.`,
    '',
    `${BOLD}${YELLOW}Заблокована команда:${RESET}`,
    `   ${cmd}`,
    '',
    `${BOLD}${YELLOW}Запропонована заміна:${RESET}`,
    `   ${suggestion}`,
    '',
    `${BOLD}Як знімати правило:${RESET} запусти команду у власному терміналі поза Claude Code,`,
    `   або тимчасово відключи hook у ~/.claude/settings.json (не рекомендую).`,
    '',
  ].join('\n');

  console.error(banner);
  process.exit(2);
} catch (e) {
  process.exit(0);
}
