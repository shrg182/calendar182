# calendar182
Gregorian and Chinese lunar calendar with daily notes, Shensha matching, and offline support.

## Development preview

The current build includes a combined Gregorian/lunar month view, month navigation, selected-day details, and a settings overview. It is not the initial product release. Notes, Shensha, authentication, automatic sync, five-language UI and offline installation are not implemented yet. Lunar display uses browser Intl and has not been independently validated.

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## GitHub Pages

Settings → Pages → Source must be GitHub Actions. The workflow checks pull requests and deploys successful main-branch builds to https://shrg182.github.io/calendar182/. The Vite base is `/calendar182/`; only `dist` is uploaded. No personal data or original Health Calendar credentials are used.

See [feature audit](docs/FEATURE_PARITY_MATRIX.md), [calculation conventions](docs/CALCULATION_CONVENTIONS.md), and [owner requirements](docs/REQUIREMENTS_UPDATE.md). Automatic cross-device sync remains required for the first release.
