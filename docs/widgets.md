# Widgets

Everything the Home Screen widget depends on, and the constraints that shaped it. Read this before
touching `targets/widgets/`, `modules/frame-photo-store/` or `src/backend/api/widget/`.

## Type-check the widget BEFORE a build — and use the right command

`swiftc -parse` only checks **syntax**. It happily accepts code that cannot compile, which cost a
full failed archive when `selection?.group?.id` (optional chaining onto an already-unwrapped
`@IntentParameterDependency` value) sailed through `-parse` and only failed inside `xcodebuild`.

The command that actually catches it:

```bash
xcrun swiftc -typecheck -parse-as-library \
  -target arm64-apple-ios18.0 -sdk "$(xcrun --sdk iphoneos --show-sdk-path)" \
  targets/widgets/FrameWidgets.swift
```

`-parse-as-library` is required, otherwise `@main` trips
`'main' attribute cannot be used in a module that contains top-level code`. Empty output means clean.

## The 30 MB ceiling is the whole design

A WidgetKit extension is Jetsam-killed at **30 MB** (`EXC_RESOURCE RESOURCE_TYPE_MEMORY
(limit=30 MB)`). For a photo widget this is *the* constraint, not a footnote: a single full-size
modern iPhone photo decodes to well over that on its own (a 4032x3024 image is ~48 MB decoded at
4 bytes per pixel).

Three rules fall out of it, and all three are load-bearing:

1. **Timeline entries carry file NAMES, never image data.** `PhotoEntry` holds a `String?`. A
   timeline of 24 entries therefore costs bytes, not megabytes. Putting a `UIImage`, `Data` or
   base64 blob in an entry is the single easiest way to crash this widget.
2. **The view decodes at render, downsampled.** `PhotoLoader.image` uses
   `CGImageSourceCreateThumbnailAtIndex` with `kCGImageSourceThumbnailMaxPixelSize` so ImageIO
   decodes *directly* to the target size and the full original is never resident.
   `kCGImageSourceShouldCache: false` on the source keeps the decoder from holding it.
3. **The app stores downsampled copies, not originals.** `FramePhotoStoreModule.savePhoto`
   downsamples to 1200 px on the long edge (`WIDGET_THUMBNAIL_MAX_PIXELS`) before anything is
   written. The widget never sees an original file.

`PhotoLoader.maxPixels(for:)` sets the decode size, and it is bounded by the timeline archive
rather than by memory — see **The decode size is set by the archive, not by the screen** below.

## The App Group is the only channel

A widget cannot run JavaScript and cannot read the app's sandbox. Everything it needs lives in
`group.com.lumen.frame`:

| What | Where | Written by |
|---|---|---|
| Downsampled JPEGs | `<container>/photos/<photoId>.jpg` | `FramePhotoStoreModule.savePhoto` |
| SQLite database | `<container>/frame.db` | op-sqlite, via the `OPSQLite_AppGroup` Info.plist key |
| JSON snapshot + settings | App Group `UserDefaults` | `WidgetService.sync` |

**op-sqlite picks its directory from `OPSQLite_AppGroup` in the app's Info.plist.** Set that key and
the database is created inside the App Group container instead of the sandbox, which is what lets
the widget open it at all. Without the key op-sqlite silently falls back to `NSLibraryDirectory` and
the widget's SQLite source returns nothing.

## Never build the simulator app with `CODE_SIGNING_ALLOWED=NO`

This cost a build cycle and the symptom points nowhere near the cause.

op-sqlite's iOS setup reads `OPSQLite_AppGroup` from the Info.plist and calls
`containerURLForSecurityApplicationGroupIdentifier`. **If that returns nil it bails out of the whole
JSI install**, and the app dies at import with:

```
Failed to install op-sqlite: The native OPSQLite Module could not be installed!
```

followed by a cascade of `Route "./_layout.tsx" is missing the required default export` warnings —
because every module importing the db client failed to evaluate. Nothing in that output mentions
entitlements or App Groups.

The container is nil whenever the app group entitlement is not embedded in the binary, and
`CODE_SIGNING_ALLOWED=NO` strips entitlements. `codesign -d --entitlements - <app>.app` printing
nothing is the tell. Simulator builds ad-hoc sign and carry entitlements perfectly well, so just
build without that flag.

## Two data sources, deliberately

`FrameStore.albums()` dispatches on the `widgetSource` key so both approaches ship and can be
compared on a real device (Settings → Widget data source):

- **`snapshot`** — reads a small JSON blob from App Group `UserDefaults`. The widget never opens a
  database. Cheapest and most robust; a schema change cannot break the widget.
- **`sqlite`** — opens `frame.db` read-only through the SQLite C API and joins albums to photos.
  One source of truth, no mirroring step, but the extension now carries a schema assumption.

`import SQLite3` needs no extra linking: the iOS SDK modulemap carries `link "sqlite3"`, so it
autolinks into the extension.

### Both were measured on device, and it is a tie (2026-09-21, iPhone 17 / iOS 27)

One album, six photos, app terminated, same placed widget:

| Source | phys_footprint | peak | timeline build |
|---|---|---|---|
| `sqlite` | 16 MB | 19 MB | ~603 ms |
| `snapshot` | 16 MB | 19 MB | ~621 ms |

**The data read is not what costs anything — image decoding is.** 19 MB peak against the 30 MB
limit is the number that matters, and it is identical either way, so pick on robustness:

- **`snapshot` is the default**, because a schema change cannot break the widget, there is no SQLite
  reader to maintain in the extension, and there is no WAL/locking failure mode. Its one cost is
  that the app must run `WidgetService.sync()` for the widget to see new data, which it does on
  every launch and after every mutation.
- **`sqlite`** is kept because it is genuinely simpler conceptually (one source of truth, nothing to
  mirror) and is the right answer if the snapshot ever grows too large for `UserDefaults`.

Keep both working. The setting that switches them is in Settings → Widget data source.

## Groups, and how the picker narrows

Albums can belong to a **group** (`album_groups` table, `albums.group_id`). A group is purely an
organising layer — photos still live in albums.

The widget's configuration has two entity parameters:

- **Group** (`GroupEntity`) — optional.
- **Album** (`AlbumEntity`) — its query carries
  `@IntentParameterDependency<SelectAlbumIntent>(\.$group)`, so **choosing a group filters the album
  list to that group's albums**. With no group chosen the list shows every album, each subtitled with
  its group name. This exists because the flat album list becomes unusable once someone has a few
  dozen albums.

`FrameStore.resolve(albumId:groupId:)` decides what actually plays, in this order:

1. a specific album, if one is chosen;
2. otherwise the whole group, flattened into one rotating set across all its albums;
3. otherwise the first album.

Both data sources carry groups: the snapshot JSON gained a `groups` array and a `groupId` per album,
and the SQLite source reads `album_groups` plus `albums.group_id`.

## Configuration: per-widget album choice

The album picker in the widget's edit sheet is an **`AppIntentConfiguration`**, not a
`StaticConfiguration`:

- `AlbumEntity: AppEntity` is one selectable album.
- `AlbumQuery: EntityQuery` supplies the options. `suggestedEntities()` is what populates the
  picker, and it reads the same App Group data the widget renders from, so the list is always the
  user's real albums.
- `SelectAlbumIntent: WidgetConfigurationIntent` carries `album` and `shuffle`.
- `PhotoProvider: AppIntentTimelineProvider` receives that configuration in `snapshot(for:in:)` and
  `timeline(for:in:)`.

Each placed widget holds its own configuration, which is what makes "three widgets, three different
albums" work with one widget kind.

## Rotation must keep working with the app CLOSED — and it does

This is the behaviour the app exists for, so it is worth being precise about why it holds.

A widget never runs the app. WidgetKit asks the *extension* for a `Timeline`, which is a list of
entries each carrying a future `date`. **iOS then advances through those entries on its own**,
rendering each one at its date, with the app terminated and the extension not even running. Nothing
in Frame's rotation path needs the app to be alive:

- `PhotoProvider.entries(for:)` builds `maxEntries(for:)` entries — 24, or 16 on extra large —
  spaced by the clamped `refreshMinutes`, each anchored to an absolute clock slot. At hourly that
  is a full day handed to iOS in one go; at the 5-minute floor it is two hours.
- Each entry holds only a **file name**, so the entry list itself is a few KB.
- When the last entry is reached, the `.atEnd` policy makes WidgetKit ask the extension for a fresh
  timeline. That runs the *extension*, reading the App Group — still no app launch.

`reloadAllTimelines()` is therefore only needed when the *data* changed (a photo added, an album
renamed). Settings → **Update widgets now** exposes that manually, and it is the right thing to tap
after importing photos if you do not want to wait.

### Verified, not assumed (2026-09-21, iOS 27, 640 px / 24 entries)

With `refreshMinutes = 5` and shuffle on, the app **terminated** for the whole run (`launchctl
list | grep com.lumen.frame` returned nothing at every sample) and the widget tile's mean RGB
sampled roughly every 70 seconds:

```
19:50:34  140-098-115   19:51:45  same   19:52:56  same   19:54:07  same
19:55:18  136-101-114  <- rotated, on the 19:55 slot boundary
```

The photo changed on the absolute five-minute slot with no app process in existence and nothing
touched on the device. Two earlier "confirmations" of this were worthless and are worth naming:
one was caused by a SpringBoard restart the test itself performed, and one matched `reload:
succeeded with 1 entries` in the extension's log, which is the snapshot path, not a timeline.
Sample the pixels, keep your hands off the device, and read chronod rather than the extension.

## The decode size is set by the archive, not by the screen

The native pixel sizes an iPhone 17 actually needs are 656 px (small), 1405 px (medium and large)
and 1839 px (extra large). Frame cannot decode to those, because the archive ceiling above is
reached first. The ceiling was found by bisection on a clean simulator carrying exactly one widget
of each family, reading chronod directly (`log stream --process chronod`) rather than the
extension's own log, which reports the placeholder path as a success and will happily lie to you:

| decode px | entries | small | medium | large |
|---|---|---|---|---|
| 520 | 48 | pass | pass | pass |
| 520 | 120 | pass | pass | pass |
| 640 | 24 | pass | pass | pass |
| 640 | 48 | fail | fail | fail |
| 660 | 24 | pass | pass | pass |
| 700 | 26 | fail | fail | fail |
| 900 | 26 | fail | fail | fail |
| 1405 | 26 | fail | fail | fail |

Two models of this were tried and both were wrong: entry count does not drive the bytes (120 to 56
entries moved the total 0.3%), and the bytes do not scale with decoded area either (an area model
predicted 9.3 MB at 700 px where 14.0 MB was measured). Only the empirical table is trustworthy.

**Shipped: 640 px, 24 entries (16 on extra large.)** That is a 23% linear sharpness gain over the
520 px that shipped in build 10, with margin below the 660-700 px cliff. Small widgets are
effectively native at 640 px; medium, large and extra large still upscale, and that is the
platform's ceiling rather than a choice. `src/const/widgetPlan.ts` mirrors these numbers for the
Diagnostics screen — change both together or the screen lies.

## Rotation is entries, not reloads

**A widget gets roughly 40–70 reloads per day**, i.e. one every 15–60 minutes, and the system —
not the app — decides. Asking for a reload per photo would burn the budget in an hour and the
widget would go stale for the rest of the day.

So rotation is done *inside one timeline*: `PhotoProvider` builds up to 24 entries, each dated
`refreshMinutes` after the last. iOS walks those entries with no reload at all. The timeline's
`.atEnd` policy asks for a refill once the last entry is consumed.

`WidgetCenter.shared.reloadAllTimelines()` (via `reloadWidgets()`) is called only when the *data*
changes: a photo added or removed, an album renamed or deleted, a setting changed.

## Shuffle is per widget, and only per widget

There is no global shuffle setting. `SelectAlbumIntent.shuffle` is the only source, so each widget
decides its own order in its edit sheet.

It used to be both, resolved as `configuration.shuffle || settings.shuffle`. That OR meant the
per-widget switch could only ever turn shuffle *on*: with the global on, a widget set to "off"
still shuffled and there was no way to make one widget stay in album order. It read as an override
and was not one. If a global default is ever wanted back, it has to be a three-state per-widget
parameter (default / always / never), never an OR.

## The widget reports its own status, and the app only reads it

Docs cannot prove to a person that rotation works; the Diagnostics screen has to. It is fed by
facts the extension writes down, not by settings the app re-derives — if the app inferred the
schedule it would state what *should* happen, which is exactly what it did while rotation was
broken and the screen still looked correct.

`PhotoProvider.timeline(for:in:)` calls `FrameStore.recordStatus` with what it actually built, into
App Group `UserDefaults` under `widgetStatus`. Four rules came out of review and each one is
load-bearing:

1. **Record the schedule, never an instant.** The record carries `firstEntryAt`, `intervalMinutes`
   and `entries`; the app computes the next change from `now` (`nextChangeAfter`). An earlier
   version stored `nextChangeAt` directly, which is true only at the moment it is written — at the
   hourly setting the record is rewritten once a day, so "Next photo" would have shown a time in
   the past while the widget rotated perfectly. That is the same "states what should happen" bug
   this whole mechanism exists to kill.
2. **`intervalMinutes` is measured, not recomputed.** It is `built[1].date - built[0].date`, so a
   change to the spacing rule cannot desync the report from the timeline.
3. **Expiry belongs on the READ path.** Records are dropped by the app after 7 days, and dropped
   entirely when `placedWidgetCount()` is 0. Pruning on write cannot work: remove the last widget
   and nothing ever writes again, so the row would be immortal and the screen would report a
   ghost widget as "past its schedule". Reading is also not memory-bound, unlike the extension.
4. **The key is the whole configuration** — `"<family>|<albumId>|<groupId>|<shuffle>"`. Keying on
   family and album alone let two same-size widgets on one album overwrite each other, which hid
   the per-widget shuffle switch: the one thing the widget edit sheet controls.

Every outcome is recorded, including failure. A widget with no album or an empty album writes a
record with `state` set to `noAlbum` or `noPhotos`, so Diagnostics says "Needs an album" instead
of "Waiting for first refresh… nothing is wrong". Absence of a record now means one thing only:
iOS has not asked yet.

The app reads the key through `WidgetService.readStatus()`, which keeps every App Group key owned
by the widget feature. `FramePhotoStore.placedWidgetCount()`
(`WidgetCenter.currentConfigurations().count`) supplies the one fact the records cannot: how many
widgets are actually on the Home Screen.

## Tinted mode will eat your photos

Under the Home Screen's tinted ("transparent") rendering mode iOS desaturates everything to a single
tint, which turns a photo into a flat silhouette. `.widgetAccentedRenderingMode(.fullColor)` applied
**after** `.resizable()` keeps real colour. `PhotoWidgetView` also checks
`@Environment(\.widgetRenderingMode)` and falls back to a solid background rather than rendering a
washed-out photo under a text overlay that would then be unreadable.

`.contentMarginsDisabled()` is what lets a photo go edge to edge; without it iOS insets the content
and you get a border.

## Things that look wrong and are not

- `Image(decorative:scale:)` rather than `Image(uiImage:)` — the photo is content, not a control,
  and this skips an accessibility label the widget has no use for.
- The `photos` directory is created lazily on first write, so a fresh install has no directory until
  the first photo is imported. `PhotoLoader` returning `nil` for a missing file is expected, not an
  error path.

## Tapping a widget opens the album it is showing

`PhotoEntry` carries the resolved `albumId`, and `PhotoWidgetView` hands
`frame:///album/<id>` to `.widgetURL`. Tapping any widget therefore lands on the album whose photo
is on screen, rather than dumping the person on the library root wondering which widget they just
touched. A widget configured by group still resolves to a concrete album per entry, so the link is
always specific; a widget with nothing configured falls back to `frame:///`.

The route is `app/(tabs)/(albums)/album/[id].tsx`. expo-router omits parenthesised groups from the
URL, which is why the link is `/album/<id>` and not `/(tabs)/(albums)/album/<id>`.

## A killed app must not freeze the rotation

Rotation is carried entirely by pre-built timeline entries, so it does not need the extension to
wake up and it does not spend the reload budget. Two values decide how long it survives without
iOS asking for anything:

- **`maxEntries(for:)` and `maxPixels(for:)` are capped by ARCHIVE SIZE, not by time or memory.**
  WidgetKit archives the *rendered view* for every entry, so the cost scales with the decoded
  image. chronod refuses a timeline over roughly 20 MB — `reload: failed with too large timeline
  archive 21889640` / `CHSErrorDomain Code=1050` — and the widget then never reloads at all and
  sits on the system's grey placeholder forever.

  The reload budget is roughly 40-70 a day and is spent only on *reloads*, never on advancing
  through entries that already exist. At 24 entries a widget asks for a new timeline once a day at
  hourly rotation and 12 times a day at the 5-minute floor, so rotation costs almost none of it.
- `.atEnd` — WidgetKit asks for the next timeline as soon as the final entry is consumed. `.after(date)`
  defers that request to a timestamp, which iOS is free to honour late on a device where the app is
  never launched.

Entries stay anchored to absolute clock slots (`slotStart`), so a reload mid-timeline resumes at the
photo the wall clock implies rather than restarting the sequence.

