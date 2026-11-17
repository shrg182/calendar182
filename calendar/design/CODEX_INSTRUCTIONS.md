# Codex Instructions — Calendar Multi-Agent Development

**Project:** Calendar (new, independent application)\
**Proposed repository:** `calendar182`\
**Reference application:** [Health Calendar](https://shrg182.github.io/health-calendar/) ([source repository](https://github.com/shrg182/health-calendar))\
**Document purpose:** An implementation brief for Codex and its specialized development agents.\
**Status:** Design and implementation plan; not a claim that any integrations have been implemented.

---

## 1. Mission and non-negotiable constraints

Build a new, responsive, offline-first **Calendar** application based on a verified inventory of Health Calendar features. Integrate a multi-agent *development workflow* and design for **user-selectable personal cloud storage**, without tying all users to one Supabase quota.

1. **Do not edit, delete, rename, redeploy, or migrate the existing Health Calendar.** Treat its public repository as a read-only reference. Do not reuse production credentials or change its database.
2. Create a **new codebase** and independent deployment. The new application's display name is **Calendar**, not Daymark or Health Calendar.
3. **Preserve existing features** after a real code audit. Do not assume that this brief lists every existing view, rule, import format, or edge case.
4. Keep calendar calculations **deterministic** and independently testable. AI agents must not fabricate Gregorian/lunar/GanZhi/Shensha results.
5. Store user edits **locally first** and keep the app functional offline. Cloud synchronization is an additional durable copy and cross-device transport, not a prerequisite for opening the calendar.
6. Support a **pluggable synchronization layer**. Start with one thoroughly tested provider; do not present unimplemented providers as available.
7. Do not remove any live data or disable a working feature until replacement behavior is validated and explicitly approved.
8. Do not add Supabase as a required dependency. An optional shared backend can be considered later for accounts, permissions, sharing, or collaboration.
9. Protect privacy: secrets and OAuth tokens must not be hardcoded, logged, or committed; obtain consent before transmitting private data to AI providers.
10. When requirements conflict or a migration could destroy data, document the issue and stop that operation rather than guessing.

## 2. Application scope and feature-parity audit

Before writing feature code, inspect the Health Calendar repository **read-only** and create `docs/FEATURE_PARITY_MATRIX.md` listing every observable feature and its new implementation/tests. At minimum, inspect:

- Gregorian date views, Chinese lunar date views, and **combined view as the default**.
- Navigation: day, week, month, year, and any continuous-day modes actually present.
- GanZhi year, month, day, and hour calculations; solar terms and relevant boundary rules.
- Shensha configuration, matching, encounter periods, and explanatory displays.
- Selected-day details, notes, notes previews, editing, and search.
- Five-language localization and language switching (verify the actual locales).
- Import/export, backup, offline installation, update notification, and settings.
- Any existing accounts, synchronization, accessibility, and regression behaviors.

**Parity acceptance:** For each feature, record the reference behavior, expected Calendar behavior, implementation file, automated test(s), and status. Any behavior intentionally deferred must be marked *not yet equivalent*, not silently omitted.

## 3. User-facing experience

Design a touch-friendly, accessible application for Mac, Windows, iPad, iPhone, and Android browsers:

- Compact responsive month view with readable Gregorian and lunar labels.
- Tap/click a date to open its details (GanZhi, solar terms, Shensha, notes, etc.).
- A clear combined calendar as the primary landing page.
- Consistent navigation, keyboard support, accessible focus states, and appropriately sized touch targets.
- `Settings > Data & Synchronization` with provider selection, connection status, last successful sync, unsynced changes, conflicts, backup/export, and recovery.
- Visible states: `Local only`, `Connecting`, `Synced`, `Syncing`, `Offline`, `Pending changes`, `Conflict`, and `Error`.
- A **Calendar Assistant** panel is optional. Calendar operations and date computations must work without an AI account or API key.

Do not infer that Calendar is a medical diagnosis product merely because its reference application is named Health Calendar. Preserve verified health features, if any, but avoid inventing new health tracking or medical advice features without requirements.

## 4. Proposed architecture

```text
[Calendar UI / PWA]
        |
        v
[Application services]
  | Calendar/GanZhi/Shensha engines (deterministic)
  | Notes, settings, search, import/export
        |
        v
[Local persistence: IndexedDB]
  | records + stable IDs + schema version
  | local operations log / outbox
        |
        v
[Provider-independent Sync Engine]
  | change tracking | retries | revisions | conflicts
  | backup/restore | optional encryption
        |
        +--> [OneDrive adapter]
        +--> [Google Drive adapter]
        +--> [Dropbox adapter]
        +--> [Nutstore / WebDAV adapter]
        +--> [Aliyun Drive adapter, subject to API approval]
        +--> [Other China providers, when supported]
        +--> [Manual file backup / restore]

[Optional shared backend, separately justified]
  | account identity / sharing / permissions / collaboration
  | PostgreSQL, SQLite-compatible backend, or other service

[Optional AI assistant]
  | calls reviewed application tools; never owns raw storage logic
```

**Separation of responsibilities:** Local database = immediate structured working data; cloud drive = user-owned synchronization and backup; optional backend database = centralized functionality such as shared permissions and multi-user collaboration. A cloud drive is **not** automatically a substitute for database transactions, access-control rules, or realtime subscriptions.

## 5. Cloud provider feasibility and rollout

Offer choices based on **actually supported integration capability**, not on a provider's popularity alone.

| Provider | Intended role | Constraints / required verification |
|---|---|---|
| **Microsoft OneDrive** | First automatic sync pilot | Microsoft Graph OAuth, app-folder scope where appropriate, delta/change tracking, conditional writes, upload sessions, quotas |
| **Google Drive** | Automatic sync | OAuth consent, app-data vs visible folder decision, API quotas, change tracking, provider availability by region |
| **Dropbox** | Automatic sync | App-folder scope, refresh tokens, cursors, revisions, rate limits |
| **坚果云 / Nutstore** | China-oriented WebDAV sync pilot | Verify WebDAV endpoints, application-password handling, CORS behavior, rate limits; **never** embed passwords in browser code |
| **阿里云盘 / Aliyun Drive** | Conditional automatic sync | Verify official API availability, developer registration, OAuth, API terms, CORS, access approval |
| **百度网盘 / Baidu Netdisk** | Conditional later phase | Verify eligibility, official API access, authentication and production approval |
| **中国移动云盘 / China Mobile Cloud Drive** | Feasibility study/manual backup initially | Do not promise automatic sync until supported API access is confirmed |
| **夸克网盘 / Quark Drive** | Manual backup initially | Do not use unofficial reverse-engineered endpoints as a production foundation |
| **腾讯微云 / Tencent Weiyun** | Manual backup/feasibility study | Confirm supported API before automatic sync |
| **天翼云盘 / China Telecom Cloud Drive** | Manual backup/feasibility study | Confirm supported API before automatic sync |
| **iCloud Drive** | File backup initially | A normal web app has no general-purpose iCloud Drive file API equivalent to Graph/Drive; distinguish from CloudKit |
| **Apple CloudKit** | Separate feasibility track | Requires Apple-specific container, identity/permissions, compatibility testing; not interchangeable with iCloud Drive |
| **Custom WebDAV / NAS** | Advanced user option | HTTPS, CORS, credential safety, remote availability, consistency and rate limiting |

Show a provider in the settings screen as **Enabled**, **Beta**, **Planned**, or **Manual backup only** according to the real state of development. For a GitHub Pages deployment, investigate OAuth redirect restrictions, CORS, token refresh/storage, and whether a minimal secure intermediary is necessary. Never implement an unsafe public token proxy.

**China accessibility requirement:** Test the actual app hosting, authentication redirects, CDN assets, provider API reachability, and update delivery from mainland China. A China-based cloud drive alone does not guarantee that a GitHub Pages app works there.

## 6. Sync and database requirements

### 6.1 Local schema

Propose a versioned IndexedDB schema including, as applicable:

- `events`, `notes`, `settings`, `calendarPreferences`;
- `records` with stable IDs, schema versions, create/update timestamps, and logical deletion markers;
- `outbox` for unsynced local operations;
- `syncState` for provider identity, cursor, revisions, errors, and last sync;
- `conflicts` and recovery snapshots.

Calendar calculations that can be recomputed need not all be persisted. Avoid using local timestamps alone to decide which concurrent edits win.

### 6.2 Provider adapter contract

Design the interface with capabilities and safe conflict semantics rather than assuming all providers implement the same APIs:

```ts
export interface CloudStorageAdapter {
  readonly id: string;
  getCapabilities(): ProviderCapabilities;
  connect(): Promise<void>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  listChanges(cursor?: string): Promise<ChangePage>;
  readRecord(key: string): Promise<RemoteRecord | null>;
  writeRecord(
    key: string,
    content: Uint8Array,
    expectedRevision?: string
  ): Promise<RemoteRevision>;
  deleteRecord(key: string, expectedRevision?: string): Promise<void>;
  disconnect(): Promise<void>;
}
```

The final contract must define how each provider handles pagination, conditional writes, tokens, resumable uploads, retries, and unsupported capabilities.

### 6.3 Synchronization behavior

- Local edits succeed without connectivity and enter a durable outbox.
- Sync is **idempotent** and retry-safe after app crashes, reloads, and network failures.
- Prefer per-record updates over replacing one giant JSON file.
- Detect remote/local concurrent changes using revisions and operation metadata; do **not** blindly use last-write-wins for notes.
- Present conflicts for resolution without discarding either version.
- Propagate intentional deletions with tombstones and an appropriate retention/recovery policy.
- Preserve unsynced changes when switching providers; migration must be verifiable and reversible.
- Export **complete recoverable backups**, with schema version, integrity checks, and restore validation.
- Encryption should be client-side when enabled. Document the tradeoffs of key recovery and multi-device setup, and never silently encrypt data with an unrecoverable key.
- Avoid excess API calls: batching, backoff, incremental sync, and resumable transport where supported.
- Record storage usage, API errors, and last-successful-sync diagnostics without leaking personal content.

### 6.4 Optional central backend

Only add a central backend if a verified feature needs server-controlled identities, shared permissions, public content, real-time multi-user collaboration, or server jobs. Document who runs it, quotas/cost, security, operations, and data-retention policies. A managed provider's restrictions do not disappear simply because a different provider is selected.

## 7. Codex development agent team

Use agents as **development roles**, orchestrated by one coordinator. Agents are not substitutes for code modules or for a deterministic data-sync engine.

| Agent | Primary deliverables |
|---|---|
| **Coordinator** | Task decomposition, dependency tracking, interface contracts, integration decisions, progress log |
| **Product/Requirements Agent** | Read-only reference audit, feature parity matrix, acceptance criteria |
| **Architecture Agent** | Module boundaries, TypeScript types, security threat model, dependency decisions |
| **Calendar Logic Agent** | Gregorian/lunar/GanZhi/Shensha engines and reference-data tests |
| **Frontend/UX Agent** | Responsive screens, accessibility, localization, state display |
| **Data & Storage Agent** | IndexedDB schema, migrations, backup/import/export, cloud adapters |
| **Sync & Reliability Agent** | Outbox, cursors, conflict rules, retries, offline and cross-device recovery |
| **Testing Agent** | Independent test plan, automated tests, negative scenarios, release verification |
| **Reviewer/Security Agent** | Code review, privacy, credentials, dependency/security review |
| **Deployment Agent** | CI, GitHub Pages deploy, PWA update strategy, rollback plan |

Work in isolated Git branches or worktrees when parallel work is beneficial. Agree on interfaces and shared fixtures before parallel coding. The Coordinator merges only after tests and review pass.

### 7.1 Why the Testing Agent is required

The **Testing Agent** independently checks whether features actually work, particularly when another agent has changed complex logic or storage behavior. Its job is to **find defects before users lose data**.

It must:

1. Translate every acceptance criterion and parity item into a test or documented manual verification.
2. Test date algorithms at year/month boundaries, leap months, solar-term transitions, time zones, and daylight-saving changes where relevant.
3. Test that the main calendar renders correctly on mobile and desktop and dates remain clickable/tappable.
4. Test offline creation and editing; reconnect and confirm changes synchronize exactly once.
5. Simulate concurrent edits on two devices, stale revisions, interrupted uploads, expired tokens, API throttling, provider outage, and quota exhaustion.
6. Validate provider switching, backup restoration, schema migration, duplicate prevention, deletion recovery, and encryption-key loss handling.
7. Check that a deployment never changes the original Health Calendar.
8. Produce actionable reports with reproduction steps, expected/actual result, severity, and regression test.
9. Block release on data loss, silent overwrite, unauthorized data access, or broken essential features.

Testing Agent must not merely approve code based on successful compilation. A green build is necessary but not sufficient.

## 8. Suggested project structure

```text
calendar182/
├── docs/
│   ├── CODEX_INSTRUCTIONS.md
│   ├── FEATURE_PARITY_MATRIX.md
│   ├── ARCHITECTURE.md
│   ├── STORAGE_PROVIDER_MATRIX.md
│   ├── SYNC_PROTOCOL.md
│   ├── SECURITY_AND_PRIVACY.md
│   └── RELEASE_CHECKLIST.md
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── calendar/
│   │   ├── ganzhi/
│   │   ├── shensha/
│   │   ├── notes/
│   │   └── settings/
│   ├── storage/
│   │   ├── local/
│   │   ├── sync/
│   │   └── adapters/
│   ├── assistant/       # optional, feature-gated
│   ├── i18n/
│   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── parity/
│   └── e2e/
├── public/
├── package.json
└── README.md
```

Use React + TypeScript + Vite as the starting proposal, with accessible CSS and a PWA. Confirm package compatibility, supported browsers, and deployment behavior before committing architecture choices.

## 9. Phased implementation, gates, and outputs

### Phase 0 — Read-only discovery
- Review reference UI, source code, tests, and import/export formats.
- Produce `FEATURE_PARITY_MATRIX.md`, documented risks, and a dependency inventory.
- **Gate:** No reference repository modifications.

### Phase 1 — New application shell
- Scaffold independent repository, routes/views, localization scaffolding, PWA setup, CI.
- Implement combined calendar layout and day details with accessible mobile interaction.
- **Gate:** Lint, typecheck, build, and basic browser tests pass.

### Phase 2 — Deterministic calendar and local data
- Implement and validate Gregorian/lunar/GanZhi/Shensha engines against the reference.
- Add IndexedDB notes/settings, migrations, local search, complete import/export.
- **Gate:** Feature-parity tests and offline editing tests pass.

### Phase 3 — Sync foundation
- Implement abstract adapter, durable outbox, change reconciliation, conflict UI, diagnostics.
- Build mock-provider tests before connecting to a real cloud.
- **Gate:** All failure-injection and conflict tests pass against the mock.

### Phase 4 — First production provider
- Integrate OneDrive (recommended pilot) using least-privilege OAuth and safe revisions.
- Verify two-device synchronization, disconnected edits, recoverability, and quotas.
- **Gate:** Reproducible tests on actual devices; explicit approval before expanding use.

### Phase 5 — Additional providers
- Investigate and implement Google Drive, Dropbox, Nutstore/WebDAV, then conditionally Aliyun Drive and other Chinese providers.
- Mark unsupported providers honestly; supply manual-backup flow where automatic API access is unavailable.
- **Gate:** Each adapter passes the same provider conformance suite.

### Phase 6 — Optional AI and shared features
- Only if requested, add Calendar Assistant and optional backend collaboration services.
- Keep AI and central service failure from blocking ordinary calendar use.
- **Gate:** Privacy, security, and feature-regression reviews pass.

### Phase 7 — Deployment and ongoing review
- Publish independently; verify offline installation, caching, update/rollback, and mobile/browser behavior.
- Document backup and restoration instructions for nontechnical users.

## 10. Required test commands and release evidence

Configure suitable npm scripts (example names):

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:e2e
npm run build
```

Do not report a command as passed unless it was actually executed. If no project or package scripts exist yet, create the scripts and identify the corresponding tools and limitations.

At the end of every coding task, report:

1. **Files created/modified** and why.
2. **Reference features preserved**, additions, and explicitly deferred work.
3. **Tests run**, results, and anything not tested.
4. **Data safety and security considerations**.
5. **Next smallest verifiable step**.

## 11. Immediate first Codex assignment (copy-ready)

> You are the Coordinator Agent for a brand-new project called **Calendar**. Read this instruction file completely. Do not modify the existing `health-calendar` repository or its deployment. First perform a **read-only** audit of the Health Calendar source and create `docs/FEATURE_PARITY_MATRIX.md`, `docs/ARCHITECTURE.md`, and `docs/STORAGE_PROVIDER_MATRIX.md`. Specifically identify the current calendar modes, GanZhi/Shensha behavior, daily notes, languages, offline functions, import/export, and cloud-dependent features. Design an IndexedDB-first architecture with a safe, provider-independent synchronization engine and an initial OneDrive pilot, while evaluating Nutstore and Aliyun Drive for users in mainland China. Explain what still requires an optional backend database. Define Testing Agent responsibilities, the initial regression suite, and approval gates. Report findings and proposed file changes **before implementing any feature or performing a migration**.

---

### Definition of done

This project is ready for an initial release only when core Health Calendar parity is documented and verified, the new Calendar app works offline, local changes are recoverable, one supported provider is reliably synchronized on at least two devices, privacy/security checks pass, and the original Health Calendar is demonstrably unchanged. Additional provider buttons must not be presented as functional until each integration has passed its acceptance tests.
