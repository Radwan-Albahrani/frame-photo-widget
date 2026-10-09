# Frame

Your photos on your Home Screen, for free.

Frame is an iOS app that puts your own photos in Home Screen widgets. It exists because photo
widget apps keep turning paid. Frame has **no ads, no subscriptions, no paywall and no limits on
albums or photos**, and it never will.

> **Status: feature complete.** Frame does what it set out to do, but contributions are still
> welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Features

- Unlimited albums, which you can organise into nested groups.
- Widgets in **small, medium, large and extra large**.
- Each widget shows its **own** album, so three widgets can show three different sets of photos.
- Photos rotate every 15 minutes, hourly, every 6 hours or daily, in order or shuffled.
- An optional album name and date overlay.
- A finder for duplicate photos across your albums.
- Widgets render correctly on Tinted and Clear Home Screens.

## Privacy

Your photos never leave your device. Frame has no accounts, analytics, crash reporting or network
code. It reads only the photos you pick through Apple's photo picker and keeps a resized copy, so
your widgets keep working even if you delete the original from Photos. The full policy is in
[PRIVACY.md](PRIVACY.md).

## Adding a widget

1. Touch and hold an empty spot on your Home Screen.
2. Tap **Edit → Add Widget** and search for **Frame**.
3. Pick a size and place it.
4. Touch and hold the widget, tap **Edit Widget**, and choose an album.

## Building from source

### Requirements

- macOS with Xcode and an iOS 18 or later simulator or device
- [Bun](https://bun.sh)

### Run it

```bash
bun install
bun run hooks:install     # enables the commit gates
bun run ios               # prebuild, build, install and launch on a simulator
bun run ios:device        # the same, on a connected iPhone
```

Metro runs on port **8082**, not the default 8081.

`bun run ios` keeps running after the build finishes, because `expo run:ios` hands off to Metro.
Check the output for the install message instead of waiting for the command to exit.

To run on a physical device you need your own Apple team, because the App Group is tied to a team.
Replace the team id `36MBFNUCBC` and the `com.lumen.frame` bundle id and App Group with your own.
They appear in `app.json`, `src/const/identifiers.ts`, `targets/widgets/expo-target.config.js` and
`targets/widgets/FrameWidgets.swift`. Do not commit these changes.

### Checks

```bash
bun run gates             # everything below, run before opening a PR
bun run types:check
bun run lint
bun run test
```

## How it fits together

Widgets cannot run JavaScript or read the app's sandbox. The app downsamples each photo you add
into a shared App Group container and records it in a SQLite database. The widget, written in
Swift, reads that container and database directly.

| Path | Contents |
|---|---|
| `app/` | expo-router screens |
| `src/backend/api/<feature>/` | one service per feature, the only surface other features import |
| `src/backend/core/db/` | Drizzle schema, op-sqlite client and migrations |
| `src/native/` | typed wrappers over the native modules |
| `src/const/identifiers.ts` | App Group, bundle id and shared keys, defined in one place |
| `src/ui/` | theme and shared components |
| `modules/frame-photo-store/` | Expo native module that downsamples photos with ImageIO into the App Group |
| `modules/frame-context-menu/` | Expo native module for context menus and drag and drop |
| `targets/widgets/` | the WidgetKit extension in SwiftUI, built with `@bacons/apple-targets` |
| `tools/lints/` | the custom commit gates |
| `docs/` | design notes and hard-won platform knowledge |

**Read [`docs/widgets.md`](docs/widgets.md) before you change anything related to widgets.** iOS
kills a widget extension that uses more than 30 MB of memory, and that limit shapes the whole photo
pipeline. [`docs/native-ui.md`](docs/native-ui.md) covers the native UI components and their traps.

## Contributing

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers getting set up and what the
commit hooks check.

## License

[MIT](LICENSE) © Radwan Albahrani
