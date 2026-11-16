# Development preview validation — 2026-11-16

Passed locally: npm install (zero reported vulnerabilities), lint, TypeScript check, three civil-date tests and production build. Chrome smoke test passed against `/calendar182/`: next month, Today, date details, Settings return, no overflow at 390px and 1280px, and no page errors. Mobile screenshot inspected at `/tmp/calendar182-mobile.png`.

Not verified: real iPhone, WebKit, independent lunar correctness, GitHub-hosted deployment until workflow completes. No notes, Shensha matching, accounts, sync, offline installation or full localization are implemented.

For browser verification run `npm run build`, `npm run preview -- --host 127.0.0.1`, then `PLAYWRIGHT_PATH=/path/to/playwright node tests/browser.cjs` in another terminal. The script uses installed Chrome and does not install browser dependencies automatically.

## Traditional labels update

Removed the large introductory heading. Cells show lunar month names on day one and traditional day names otherwise; common holiday names precede solar terms, with both shown on collisions. Full lunar labels remain in day details. Gregorian dates/Today stay device-local. Library conversion accepts civil components without converting the selected device instant into another date.

Added lunar-javascript 1.7.8 (MIT; notice shipped in public/lunar-javascript-LICENSE.txt). Holiday names are a curated fixed-date/lunar-date set, excluding leap-month repetitions; they are not an official statutory holiday schedule. No date calculations for existing GanZhi/Shensha have been changed.

Passed: lint, typecheck, 6 tests, production build, Chrome phone/desktop smoke and visual inspection. Six tests also pass under Pacific/Honolulu and Pacific/Kiritimati. Source-derived fixture tests compare every 2026 lunar date and all 24 solar-term civil dates, plus leap-month labels, New Year’s Eve, Spring Festival, Christmas, holiday collisions and ordinary days. Full 1901–2100 correctness and real-device Safari remain unverified. Production JS is about 172 KB gzip following addition of the calendar library; Vite warns that the single minified chunk exceeds 500 KB.

Fixture sources (retrieved 2026-11-16):
- Hong Kong Observatory: https://data.weather.gov.hk/weatherAPI/hko_data/calendar/nongli_calendar_2026.csv
- Hong Kong Observatory: https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt
- Dataset: https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table
- HKO notes future near-midnight uncertainty: https://www.hko.gov.hk/en/gts/time/conversion.htm
- Library: https://github.com/6tail/lunar-javascript

The HKO fixture contains factual dates and labels; source prose is not reproduced. The reference calculation-conventions document describes the old app, not the new label engine.
