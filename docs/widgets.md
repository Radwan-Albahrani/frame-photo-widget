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

`PhotoLoader.maxPixels(for:)` tightens this further per family, since a small widget never needs
more than ~520 px.

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

- `PhotoProvider.entries(for:)` builds one entry per photo, spaced `refreshMinutes` apart, and keeps
  going until the timeline covers at least `targetSpanSeconds` (6 hours) or `maxEntries` (120),
  whichever comes first. A 5-minute interval therefore hands iOS ~72 pre-dated entries in one go.
- Each entry holds only a **file name**, so a 120-entry timeline is a few KB.
- When the last entry is reached, the `.after` policy makes WidgetKit ask the extension for a fresh
  timeline. That runs the *extension*, reading the App Group — still no app launch.

`reloadAllTimelines()` is therefore only needed when the *data* changed (a photo added, an album
renamed). Settings → **Update widgets now** exposes that manually, and it is the right thing to tap
after importing photos if you do not want to wait.

### Verified, not assumed (2026-09-21, iPhone 17 / iOS 27)

With `refreshMinutes = 5`, the app **terminated** (`pgrep` confirmed only `FrameWidgets.appex`
alive), the widget's mean RGB over its tile was sampled every 2 minutes:

```
T+0  (209,179,173)   T+2  same   T+4  same   T+6  (147,98,196)  <- rotated
```

The photo changed on schedule with no app process in existence. If a future change makes rotation
depend on the app running, this is the check that catches it.

## Rotation is entries, not reloads

**A widget gets roughly 40–70 reloads per day**, i.e. one every 15–60 minutes, and the system —
not the app — decides. Asking for a reload per photo would burn the budget in an hour and the
widget would go stale for the rest of the day.

So rotation is done *inside one timeline*: `PhotoProvider` builds up to 24 entries, one per photo,
each dated `refreshMinutes` after the last. iOS walks those entries with no reload at all. The
timeline's `.after` policy asks for a refill once the last entry is consumed.

`WidgetCenter.shared.reloadAllTimelines()` (via `reloadWidgets()`) is called only when the *data*
changes: a photo added or removed, an album renamed or deleted, a setting changed.

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

