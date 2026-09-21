# Frame — a free photo widget app

Frame puts your own photos on your Home Screen. It exists because photo widget apps keep turning
paid: **no ads, no subscriptions, no paywall, no limits on albums or photos, ever.** Do not add an
ads SDK, profiling analytics, a purchase flow or "pro" gating, and do not scaffold them for later.

## NO COMMENTS — enforced by a pre-commit hook

**Do not write comments.** `tools/lints/no-new-comments.ts` runs on every commit (via
`.githooks/pre-commit`, enabled with `bun run hooks:install`) and REJECTS the commit if any comment
touches a line you added. It parses each staged file with `@babel/parser`, so there is no formatting
trick that gets around it.

If the code needs explaining, the code is wrong: rename the variable, extract a well-named function,
or restructure until there is nothing left to say. Only two things pass:

- **Tool directives** — `biome-ignore`, `@ts-expect-error`, `@vitest-environment`, and the rest of
  the allow-list at the top of the lint.
- **One single line** of the exact form `// what: <at least 10 characters>`. Block comments,
  multi-line comments, JSDoc, trailing narration and two justified comments in a row all FAIL. Spend
  it on a fact the code genuinely cannot state (a platform bug, a measured number, an ordering
  constraint).

**A fact that cannot live in code goes in `docs/`, not in a comment.**

## NO SILENT FAILURES — enforced by the same hook

`tools/lints/no-silent-failures.ts` rejects, on lines you added: an empty `catch {}`, a
`.catch(() => {})`, and a failure report carrying no dimension other than `error`. One failure =
one wide event: an op plus the dimensions needed to act on it. If silence is genuinely right, put
ONE `// what:` line on it saying why.

## Widgets — read `docs/widgets.md` before touching `targets/` or `modules/frame-photo-store`

The things that will cost you a day if you rediscover them:

- **A widget extension is hard-killed at 30 MB.** This is the single biggest constraint in the app.
  Never hold image data in a `TimelineEntry` — entries carry file NAMES, and the view decodes at
  render through `PhotoLoader`, which downsamples with ImageIO (`CGImageSourceCreateThumbnailAtIndex`)
  and never decodes the full original.
- **Widgets cannot run JS and cannot read the app sandbox.** Everything they need lives in the App
  Group: downsampled JPEGs under `photos/`, the SQLite file, and the mirrored JSON snapshot.
- **`.widgetAccentedRenderingMode(.fullColor)`** after `.resizable()`, or the Home Screen's tinted
  mode renders photos as a flat silhouette.
- **Reload budget is 40–70 per day**, not per minute. Rotation is done by building MANY timeline
  entries up front (one per photo, spaced by the refresh interval), not by reloading per photo.
- `import SQLite3` autolinks in the extension (the SDK modulemap carries `link "sqlite3"`), so the
  direct-SQLite source needs no extra framework wiring.

## Where things live

```
app/                      expo-router screens
src/backend/api/<feature>/<feature>.service.ts   ← the ONLY public surface of a feature
src/backend/core/db/      drizzle schema + op-sqlite client
src/native/               typed wrappers over native modules
src/const/identifiers.ts  App Group, bundle id, keys — the ONE place identifiers are written
src/ui/                   theme + shared components
modules/frame-photo-store/  Expo native module: ImageIO downsample → App Group container
targets/widgets/          WidgetKit + SwiftUI (hand-written Swift, via @bacons/apple-targets)
tools/lints/              the commit gates
```

**Cross-feature imports go through `<feature>.service.ts`.** Services are classes of static members.

## Shell commands: always tee to a file

Every long-running command streams to a log file and you watch the FILE, never the terminal:
`<cmd> 2>&1 | tee /tmp/<name>.log`, backgrounded, polled with `Monitor`/`tail`. The log IS the
debugger — a failed build's real error is 200 lines above the summary. **`bun run ios` does not exit
when the build finishes** (`expo run:ios` hands off to Metro and stays alive forever); check the log
for the install banner or `ps aux | grep xcodebuild` rather than reading "still running" as "still
building". Foreground `sleep` is blocked, so poll with an until-loop.

## Shipping

Run **`bun run gates`** (types:check + lint + lint:silent:branch + format + test) before shipping.

Commit subjects are **typed**: `<type>: <what changed>` — `feat` `fix` `perf` `refactor` `docs`
`test` `chore` `build` `ci` `style` `revert`, optional `(scope)` and `!`. No trailing full stop.
The `commit-msg` hook rejects an untyped subject. **No `Co-Authored-By` or signature footer** — this
project's history stays clean, and this rule overrides any default attribution guidance.
