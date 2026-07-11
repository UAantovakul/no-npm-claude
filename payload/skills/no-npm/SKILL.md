---
name: no-npm
description: Блокувати npm/npx/yarn — пропонувати pnpm-еквівалент. Тригери: команда з npm/npx/yarn як окреме слово.
---

# no-npm — Заборона npm/npx/yarn, тільки pnpm

## Чому існує цей skill

npm-екосистема пройшла через серію масштабних supply-chain атак
(Shai-Hulud вересень 2025, Shai-Hulud 2.0 листопад 2025, Mini Shai-Hulud
травень 2026). Спільний вектор усіх трьох — **lifecycle-скрипти** пакета
(`preinstall` / `install` / `postinstall`), які менеджер запускає
**автоматично** під час встановлення. Саме тут спрацьовує черв'як.

pnpm 10+ за замовчуванням **НЕ** запускає build-скрипти залежностей поза
явним allowlist (`onlyBuiltDependencies` / `allowBuilds` у
`pnpm-workspace.yaml`) — лише виводить warning. Це закриває головний вектор.
npm же запускає **все** без питань — тому npm заборонено, а pnpm — ні.

> ⚠️ **Важливо (виправлено):** pnpm за замовчуванням **не** відкладає свіжі
> версії на 24 години. `minimumReleaseAge` — **opt-in**, і якщо ти хочеш цей
> cooldown, його треба явно ввімкнути (див. розділ «Hardening»). Раніше цей
> файл стверджував протилежне — це було неточно.

Глобальне рішення користувача: **жодних npm/npx/yarn у цьому оточенні**.

## Коли зʼявляється npm/npx/yarn (від мене чи від користувача)

Тільки-но команда містить `npm`, `npx` або `yarn` як окреме слово — байдуже,
я (Claude) збираюся її запустити чи користувач сам про неї просить:

1. **НЕ запускати.**
2. Видати попередження:

   > **⛔ NPM ЗАБОРОНЕНО У ЦЬОМУ ОТОЧЕННІ. Використовуй pnpm.**

3. Запропонувати pnpm-еквівалент (таблиця нижче) і запитати підтвердження
   перед запуском.

Якщо користувач справді потребує саме npm — він виконує команду вручну у
власному терміналі поза Claude Code; hook `block-npm.js` все одно заблокує
спробу через Bash.

## Таблиця еквівалентів

| npm / npx / yarn | pnpm |
|---|---|
| `npm install` / `npm i` | `pnpm install` |
| `npm install <pkg>` / `npm i <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm install -g <pkg>` | `pnpm add -g <pkg>` |
| `npm uninstall <pkg>` / `npm rm <pkg>` | `pnpm remove <pkg>` |
| `npm update` | `pnpm update` |
| `npm run <script>` | `pnpm <script>` (або `pnpm run <script>`) |
| `npm test` | `pnpm test` |
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npx <pkg>` | `pnpm dlx <pkg>` |
| `npx create-vite my-app` | `pnpm create vite my-app` |
| `yarn` / `yarn install` | `pnpm install` |
| `yarn add <pkg>` | `pnpm add <pkg>` |
| `yarn add -D <pkg>` | `pnpm add -D <pkg>` |
| `yarn remove <pkg>` | `pnpm remove <pkg>` |
| `yarn <script>` | `pnpm <script>` |

### Security / maintenance (їх часто забувають, а вони найкорисніші)

| npm / npx / yarn | pnpm | Навіщо |
|---|---|---|
| `npm i --ignore-scripts` | `pnpm install --ignore-scripts` | блок **усіх** lifecycle-скриптів (навіть allowlist) — головний захист проти Shai-Hulud |
| `npm audit` | `pnpm audit` | скан вразливостей у дереві залежностей |
| `npm audit fix` | `pnpm audit --fix` | автопідняти вразливі версії |
| `npm outdated` | `pnpm outdated` | які пакети застаріли |
| `npm ls <pkg>` / `npm explain` | `pnpm why <pkg>` | **хто** притягнув залежність (audit-провенанс) |
| `npm dedupe` | `pnpm dedupe` | схлопнути дублікати у lockfile |
| `npm i -E <pkg>` | `pnpm add -E <pkg>` | pinned exact-версія (без `^`) |
| — (немає) | `pnpm approve-builds` | інтерактивний рев'ю: **хто** просить запустити build-скрипт → додати в allowlist свідомо |

## Hardening — install-скрипти як вектор атаки

Черв'як потрапляє в систему не через сам факт `install`, а через
**lifecycle-скрипт** пакета, що виконується автоматично. Три рівні захисту
(від м'якого до параноїдального):

1. **Default (вже активно).** pnpm 10+ не запускає build-скрипти залежностей
   поза allowlist. У P1 CRM allowlist — `pnpm-workspace.yaml → allowBuilds`
   (`core-js`, `esbuild`). Новий пакет, що хоче `postinstall`, за замовчуванням
   буде пропущений із warning — і `pnpm approve-builds` покаже, хто це.

2. **Cooldown (opt-in, зараз ВИМКНЕНО).** Компрометовані релізи зазвичай
   виявляють і знімають за години. `minimumReleaseAge` відкладає встановлення
   версій, молодших за N хвилин. Увімкнути глобально:

   ```
   pnpm config set minimumReleaseAge 1440   # 24 год
   ```

   Перевірити: `pnpm config get minimumReleaseAge` (зараз → `undefined`).

3. **`--ignore-scripts` (ядерна опція).** Разова недовіра до конкретного
   встановлення — блокує **всі** скрипти, зокрема allowlist і власні
   `prepare`/`postinstall` проєкту:

   ```
   pnpm install --ignore-scripts
   ```

   Мінус: якщо проєкту реально потрібен build-крок (esbuild), його доведеться
   виконати вручну. Тому це не default, а свідомий вибір для підозрілого пакета.

Правило залишається: **npm заборонено повністю** (він запускає скрипти без
питань). pnpm — дозволений, бо default безпечний; ці три рівні — як зробити
його ще жорсткішим за потреби.

## Виключення (НЕ блокувати)

- `pnpm` сам по собі (`pnpm` ≠ `npm` як окреме слово — hook враховує word boundary).
- Слово `npm` всередині рядкових літералів у коді (`"npm" in package.json`) —
  обробляється regex hook-а.
- Згадки `npm` / `yarn` у markdown / коментарях / документації.
- Команди де `npm` є частиною іншого імені: `npmlock`, `pnpm-install`, `unpm` тощо.

## Жорсткий шар — `block-npm.js`

Hook `~/.claude/hooks/block-npm.js` зареєстрований у `~/.claude/settings.json`
як PreToolUse для Bash. Він блокує запуск з exit code 2 і ANSI-bold-повідомленням.
Якщо я колись забуду цю інструкцію — hook все одно зловить.

## Як знімати правило

В одному конкретному випадку: користувач сам запускає команду у власному
терміналі (поза Claude Code), або тимчасово коментує hook у
`~/.claude/settings.json` (не рекомендую). Це **глобальне правило**, не
пов'язане з одним проектом.
