# Shensha settings synchronization

The computer-hosted Calendar synchronizes saved Shensha settings through the same
account/session and computer-sync pause control as notes. The public GitHub Pages
calendar stays local-only. Keep the computer awake and the Calendar open for
scheduled synchronization (normally every 15 seconds); Sync now also transfers
settings. Settings import queues the imported version in the same way as Save.
Unsaved settings and note drafts are never uploaded.

The synchronized version includes targets, enabled flags, manual strengths,
custom effects, calculation time zone and retained birth pillars. A blank time
zone continues to follow each receiving device. Notes JSON backups remain separate;
use Shensha export for a portable settings file. Computer SQLite snapshots and
selected-folder copies include accepted settings history. A full database restore
preserves that history; note-only recovery/merge tools do not transfer settings.

## First connection and conflicts

Existing account-scoped localStorage settings are validated and copied once into
an account-scoped IndexedDB store, preserving the old key. Empty new browsers take
the computer version. Existing saved device settings are queued against revision
zero. If the computer already has different settings, neither version is silently
overwritten. Close older Calendar tabs after saving drafts before using this
release, so older code cannot keep editing the preserved legacy key.

Settings shows both saved versions, including time zone, retained birth pillars,
and each item's targets/strength/effect. Export local settings to retain a separate
copy if desired. Keep this device's settings queues the local version against the
reviewed computer revision. Use computer settings replaces the saved device
version. A further computer change causes another review. Unsaved settings must
first be saved or explicitly discarded with Load saved selections; incoming data
never replaces a draft. A stale save is refused and the draft is retained.

## Persistence and protocol

Settings use a dedicated account-scoped IndexedDB database, separate from notes.
A read/write transaction coordinates migration, generation checks, pending saves,
acknowledgements and conflict decisions across tabs, including HTTP browsers
without Web Locks. BroadcastChannel and a two-second refresh fallback update tabs.
The service stores immutable settings operations separately from note operations.
Each accepted save has a unique ID and compare-and-swap base revision. Exact
retries return the original acknowledgement, even if another device later saved.
New edits made during upload stay queued against that acknowledgement. Session,
account, epoch, same-origin and host checks apply to every settings request.
Server validation checks version, zone, pillars, allowed targets, strengths and
effects; malformed responses never overwrite client settings. A changed service
epoch blocks upload while retaining device data. Existing note behavior is retained.

## Verification (November 21, 2026)

33 TypeScript tests and 73 Python service/backup tests passed, with typecheck and
lint clean. Tests cover lost acknowledgements, concurrent saves during upload,
offline queuing, pausing, stale tabs, service identity, server validation, account
isolation and snapshot preservation. Isolated Chrome and WebKit profiles exercise
two-device transfer, unsaved drafts, offline conflict review, both choices,
legacy-settings migration, reload and 320/390/820-pixel layouts. Existing local
Shensha download/import regression passed. These automated profiles do not
establish new physical iPad/Xiaomi acceptance.

Activation: a fresh verified SQLite snapshot was created before restarting only
the existing Calendar HTTP/HTTPS agents. Both served the tested bundle with 200
responses, including CA-validated HTTPS. Service epoch, 28 note operations, current
record count and six sessions were preserved; integrity check passed. Previous
static assets were retained. No GitHub Pages deployment was performed. Save drafts
and close older tabs before reopening the computer-hosted Calendar on devices.

## Settings presentation

The settings editor follows Health Calendar's grouped 神/煞/自定义 rows. Enabled
items expose searchable pickers with allowed 天干/地支/干支 sections. Chosen
targets remain visible as removable chips when the picker closes. Disabling an
item retains its targets. Manual strength and custom effects stay visible; Save
and Load remain explicit. The layout stacks on phones and uses two columns on
larger screens. Presentation changes do not alter synchronization or calculations.
