# Reference calculation conventions

Source inspection: 2026-11-16, Health Calendar `app.js` and `shensha.js`, with README cross-check. This records implementation behavior, not independently established astronomical or traditional accuracy.

## Civil dates and lunar display

UI dates range from 1901-01-01 through 2100-12-31. Main calendar dates use device-local JavaScript date components. Notes use Gregorian `YYYY-MM-DD` keys without timezone conversion. Changing timezone must not shift those keys.

Lunar display uses `Intl.DateTimeFormat('zh-CN-u-ca-chinese-nu-latn')` and a numeric `en-u-ca-chinese-nu-latn` formatter. No timezone override is passed. Leap months are inferred from `bis` in the numeric month part; Chinese displays browser month text and an explicit lunar-day label table. Other locales use numeric month/day with a leap label. Browser ICU support is therefore part of the calculation dependency; identical JavaScript alone does not guarantee cross-browser identity.

## Day pillar

`sexagenaryDay` takes the selected civil year/month/day, calculates `floor(Date.UTC(y,m,d)/86400000)+2440588`, then indexes the 60-cycle with positive modulo of `JDN+49`. Stem and branch use cycle modulo 10 and 12. The day changes at civil midnight, including both portions of the 子 hour. This is not a 23:00 rollover convention.

## Solar terms and year/month pillars

Only twelve jie are present: 小寒、立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪. Their target longitudes are 285°, 315°, 345°, 15° … 255°. The source approximates longitude using Julian days from J2000, mean anomaly/longitude and two sine corrections. It bisects a ±7-day bracket around a fixed approximate date for 42 iterations, falling back to the guessed UTC noon if the bracket fails. Iteration count does not establish astronomical precision. Keep estimate labels.

`pillarsFor` evaluates the latest term at or before noon in the relevant timezone. The year changes at 立春, not Gregorian New Year or lunar New Year. The year cycle is `(solarYear-4) mod 60`. The first month stem uses `((yearStemIndex mod 5)*2+2) mod 10`; the term offset determines the month stem and branch (寅 begins at 立春).

An estimated term after local noon becomes effective on the next civil date. Encounter interval end dates are the day before the next effective boundary, keeping inclusive ranges consistent with day-card pillars. Main calendar uses device noon; Shensha can use noon in the selected IANA zone. The zone conversion iteratively resolves wall-clock noon through Intl, rather than a dedicated timezone library.

## Hour pillars and Shensha

Hour rows use local wall-clock intervals: 子 00:00–01:00 and 23:00–24:00, 丑 01:00–03:00, through 亥 21:00–23:00. Hour branch index is `floor((hour+1)/2) mod 12`; stem index is `((dayStemIndex mod 5)*2+branchIndex) mod 10`. Both 子 portions use that civil date's day stem. These are wall-time labels; a DST day need not contain 24 elapsed hours.

Targets are manually selected; the app does not infer them from a birth chart. Eighteen named rules and three custom slots have restricted target sets. Hour encounters require the same item to match at least two year/month/day pillars first. Counts are per item/pillar, not per target or number of hour intervals. Kongwang retains a whole-date rule and grey presentation; other items retain their colors and repeat-strength signs. Detailed per-item behavior must be extracted from `shensha.js` and checked against `docs/shensha_calculation.md` §18 before porting.

## Required evidence before changing calculations

1. Capture reference outputs at 1901/2100 edges, leap days, lunar new years, leap lunar months and month ends in Chrome and WebKit.
2. Check term boundaries just before/at/after noon, 立春 and 小寒 across year boundaries, and opposite-offset IANA zones.
3. Check midnight and both 子 segments, DST transitions and unusual offsets without converting note keys to instants.
4. Independently validate lunar/term dates using published authoritative fixtures; independently document GanZhi/hour and Shensha rule references. Existing parity tests alone establish no accuracy claim.
5. For every discrepancy record date/time, timezone, old output, proposed output, independent source, cause and practical effect. Distinguish implementation defects, estimates and convention choices. Explain and obtain a product decision before adopting a convention change.

No independent fixtures were downloaded or executed in this audit. No superiority claim is made for a replacement engine.
