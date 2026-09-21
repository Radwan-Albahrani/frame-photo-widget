# Frame

Your photos, on your Home Screen. Free.

Frame exists because photo widget apps keep turning paid. **No ads, no subscriptions, no paywall,
no limits on albums or photos.**

## What it does

- Make as many albums as you like and fill them with your own photos.
- Add a Frame widget in **small, medium, large or extra large**.
- Each widget picks its **own** album, so three widgets can show three different sets of photos.
- Photos rotate on your schedule: every 15 minutes, hourly, every 6 hours or daily. Optionally
  shuffled.
- Optional album name and date overlay.

Your photos never leave the device. Frame keeps a resized copy in its own storage so your widgets
keep working even if you later delete the original from Photos.

## Adding a widget

1. Touch and hold anywhere on your Home Screen.
2. Tap **Edit → Add Widget** and search for **Frame**.
3. Pick a size.
4. Touch and hold the placed widget, tap **Edit Widget**, and choose the album.

## Development

Requires Xcode and [Bun](https://bun.sh).

```bash
bun install
bun run hooks:install     # commit gates
bun run ios               # prebuild + run on a simulator
```

Other scripts:

```bash
bun run gates             # types + lint + no-silent-failures + format + tests
bun run types:check
bun run lint
bun run test
```

`bun run ios` does not exit when the build finishes — `expo run:ios` hands off to Metro and stays
alive. Watch the log rather than the exit code.

## How it is put together

| Path | What lives there |
|---|---|
| `app/` | expo-router screens |
| `src/backend/api/<feature>/` | one service per feature, the only cross-feature surface |
| `src/backend/core/db/` | drizzle schema + op-sqlite client |
| `src/native/` | typed wrappers over native modules |
| `src/const/identifiers.ts` | App Group, bundle id and shared keys, written once |
| `modules/frame-photo-store/` | Expo native module: ImageIO downsample into the App Group |
| `targets/widgets/` | WidgetKit + SwiftUI, via `@bacons/apple-targets` |
| `tools/lints/` | the commit gates |

**Read `docs/widgets.md` before touching anything widget-related.** A widget extension is
hard-killed at 30 MB, and that constraint shapes the entire photo pipeline.

`CLAUDE.md` carries the working conventions: no comments, no silent failures, typed commit
subjects.

## Licence

MIT.
