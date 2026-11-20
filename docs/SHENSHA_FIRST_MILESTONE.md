# Shensha first milestone — 2026-11-20

Settings now offers 18 named items and three custom slots with manual target
selection. Saved settings drive year/month/day/current-hour results on the
selected day. Hour intervals can be expanded. The ordinary month cells remain
unchanged. Encounter-date lists and cross-device settings sync are later work.

## Reference behavior retained

Read-only reference: health-calendar/shensha.js, app.js and
health-calendar/docs/shensha_calculation.md §18–19. 元辰 and 魁罡 are excluded.
Targets are manual values, not inferred birth-chart anchors. Restricted branches,
pairs and special sets follow the reference. 灾煞/custom slots support all stems,
branches and valid 60-cycle pairs; 天德/月德 support stems and branches.

Year changes at 立春 and month at the twelve 节. The reference's approximate
solar-longitude calculation and local-noon effective-date convention are retained,
including approximate pillar ranges. Calendar's existing UTC+8 lunar labels and
24-term date labels still use lunar-javascript; these are distinct conventions.
The new engine does not claim better astronomical accuracy.

Day changes at civil midnight. The two 子 segments use that day's stem. Hour
strengthening requires the same item on at least two year/month/day pillars;
multiple targets in one pillar do not inflate counts. 神/煞 repeats have +/−
indicators and four-pillar matches use strong color. 空亡 on baseline pillars
marks all results inactive; hour-only 空亡 cannot disable the date.

## Storage and UX

Saved under calendar182.shensha.v1:<note storage scope>, separating ordinary
local use and each staging account. No data is read from Health Calendar.
Explicit Save validates allowed targets and timezone. Blank timezone uses this
device; a valid IANA zone can be selected. Day results use the saved configuration,
not an unsaved settings draft. Draft selections survive app navigation and warn
before page close. Settings navigation does not replace the daily-note draft.

Storage errors retain drafts and report failure. A save checks the stored value
against the version originally loaded and refuses to overwrite a detected
other-tab change. “Load saved selections” asks before discarding a local settings
draft. This is an optimistic guard, not atomic simultaneous-tab synchronization;
selections are local-only and not included in notes exports. No provider/account
sync contract or migration has been introduced.

## Verification

- 24 application unit tests passed, including five Shensha tests for reference
  pillars, target restrictions, per-pillar counting, hour gating, 空亡, date edges,
  solar-noon transitions, midnight and DST-date coverage.
- Read-only comparison against original app functions passed 55 cases: 11 dates
  across Detroit, Shanghai, Honolulu, Kiritimati and Kathmandu, including pillar
  values, year/month date ranges and every hour slot. This establishes reference
  parity for those cases, not independent traditional/astronomical accuracy.
- Isolated Chrome tests cover save/reload, matches and hour strengthening,
  空亡 display, note-draft preservation, 320/390/1280 widths, detected concurrent
  settings edits and storage-write failures. Synthetic browser profile only.
- TypeScript and lint passed. Ordinary build is /tmp/calendar-shensha-build;
  sync-enabled build is /tmp/calendar-shensha-staging-build. Existing large-bundle
  warning remains. Temporary files may disappear in later sessions.

Browser test command after building an isolated ordinary bundle:

```sh
SHENSHA_TEST_DIST=/tmp/calendar-shensha-build \
PLAYWRIGHT_PATH=/Users/ruixingshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
node tests/shensha-browser.cjs
```

## Activation and next steps

Owner authorized updating and publishing Calendar on November 20. The tested
sync-enabled static bundle was installed on the retained service without
restarting either process or changing notes, sessions or credentials. Previous
hashed assets were retained for open tabs; old bundle backup is under the system
temporary folder calendar-before-shensha-dl_c8hcm. Public publication uses the
ordinary local-only build on main via GitHub Pages. Health Calendar is unchanged.
Recovery development remains paused. Save drafts before refreshing; HTTPS
service-worker updates may require closing saved Calendar tabs and reopening.

Review the first milestone in an isolated preview before controlled activation.
Then implement encounter lists with the reference's inclusive date ranges and
31-day pages. Cross-device Shensha settings need their own versioned settings
record; do not put them into daily notes or silently adopt another account's data.
