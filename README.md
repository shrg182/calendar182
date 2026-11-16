# calendar182
Gregorian and Chinese lunar calendar with daily notes, Shensha matching, and offline support.

## Development preview

The current build includes a combined Gregorian/lunar month view, month navigation, selected-day details, and a settings overview. It is not the initial product release. Daily notes save to this device in IndexedDB, with explicit Save/Delete, in-page drafts and JSON export containing prior versions and ordered local operations. Validated JSON import supports Calendar182 and legacy Daymark version 1 backups, with a preview and keep/replace choices. Shensha, authentication, automatic sync, five-language UI and offline installation are not implemented yet. Lunar labels and 24 solar terms use lunar-javascript with a UTC+8 civil-date reference. All 365 lunar dates and 24 term dates in 2026 match HKO tables; other years have not been exhaustively checked. Month cells show traditional Chinese labels, common festivals and solar terms.

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## GitHub Pages

Settings → Pages → Source must be GitHub Actions. The workflow checks pull requests and deploys successful main-branch builds to https://shrg182.github.io/calendar182/. The Vite base is `/calendar182/`; only `dist` is uploaded. No personal data or original Health Calendar credentials are used.

See [feature audit](docs/FEATURE_PARITY_MATRIX.md), [calculation conventions](docs/CALCULATION_CONVENTIONS.md), and [owner requirements](docs/REQUIREMENTS_UPDATE.md). Automatic cross-device sync remains required for the first release.
