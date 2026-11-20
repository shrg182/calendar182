# calendar182
Gregorian and Chinese lunar calendar with daily notes, Shensha matching, and offline support.

## Development preview

The current build includes a combined Gregorian/lunar month view, month navigation, selected-day details, and a settings overview. It is not the initial product release. Daily notes save to this device in IndexedDB, with explicit Save/Delete, in-page drafts, browsable note history and JSON export containing prior versions and ordered local operations. Validated JSON import supports Calendar182 and legacy Daymark version 1 backups, with a preview and keep/replace choices. Shensha manual-target settings and selected-day pillar/hour matches are available, with local saved selections. Cross-device Shensha settings sync, encounter lists, production authentication, five-language UI and ordinary-build offline installation remain unfinished. The public build is local-only; computer-hosted note sync is a separate staging mode. Lunar labels and 24 solar terms use lunar-javascript with a UTC+8 civil-date reference. All 365 lunar dates and 24 term dates in 2026 match HKO tables; other years have not been exhaustively checked. Month cells show traditional Chinese labels, common festivals and solar terms.

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the HTTP address printed by Vite (usually `http://localhost:5173/calendar182/`) and keep the terminal running. Opening `index.html` with a `file://` URL does not run the application: Vite must compile its TypeScript/React modules. Use the same browser and URL consistently; different origins such as `localhost` and `127.0.0.1` have separate saved notes. For a production-build preview, run `npm run build` followed by `npm run preview -- --host 127.0.0.1`, then open `http://127.0.0.1:4173/calendar182/`.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## GitHub Pages

Settings → Pages → Source must be GitHub Actions. The workflow checks pull requests and deploys successful main-branch builds to https://shrg182.github.io/calendar182/. The Vite base is `/calendar182/`; only `dist` is uploaded. No personal data or original Health Calendar credentials are used.

See [feature audit](docs/FEATURE_PARITY_MATRIX.md), [calculation conventions](docs/CALCULATION_CONVENTIONS.md), and [owner requirements](docs/REQUIREMENTS_UPDATE.md). Automatic cross-device sync remains required for the first release.

To recover earlier text, open a date → Note history → choose a version → Use this version → Save note. Existing unsaved drafts require confirmation before replacement.

## Project documentation

The application and Git repository root is `calendar182/`. Run development commands from this directory. The nested [`calendar/`](calendar/) folder preserves the moved planning workspace: design briefs, reviews, and early audit snapshots. Current application documentation lives in [`docs/`](docs/); the consolidated development handoff is [`calendar/HANDOFF.md`](calendar/HANDOFF.md).

## Isolated computer-sync test

The ordinary development preview remains local-only. A separate Calendar staging build now connects to the computer-hosted Python sync experiment using isolated account-specific notes. Run `npm run build:computer` and follow the [staging instructions](prototype/sync/README.md#calendar-ui-staging-build--2026-11-17). It uses test credentials and synthetic notes; provider switching and production account handling are not implemented.

The isolated build also supports offline reopening and safe waiting updates on secure origins. Plain HTTP LAN addresses cannot provide this on iPad; optional local HTTPS setup requires explicit device certificate trust. See [offline loading and local HTTPS](docs/OFFLINE_LOADING.md). The public build is unchanged.
