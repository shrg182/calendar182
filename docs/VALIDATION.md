# Development preview validation — 2026-11-16

Passed locally: npm install (zero reported vulnerabilities), lint, TypeScript check, three civil-date tests and production build. Chrome smoke test passed against `/calendar182/`: next month, Today, date details, Settings return, no overflow at 390px and 1280px, and no page errors. Mobile screenshot inspected at `/tmp/calendar182-mobile.png`.

Not verified: real iPhone, WebKit, independent lunar correctness, GitHub-hosted deployment until workflow completes. No notes, Shensha matching, accounts, sync, offline installation or full localization are implemented.

For browser verification run `npm run build`, `npm run preview -- --host 127.0.0.1`, then `PLAYWRIGHT_PATH=/path/to/playwright node tests/browser.cjs` in another terminal. The script uses installed Chrome and does not install browser dependencies automatically.
