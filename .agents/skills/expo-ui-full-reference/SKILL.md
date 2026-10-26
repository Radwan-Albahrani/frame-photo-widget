---
name: expo-ui-full-reference
description: >-
  Build native UI from React with @expo/ui: real SwiftUI on iOS and Jetpack Compose on
  Android, in an Expo or React Native + TypeScript app. Use whenever building or reviewing
  native-feeling UI that plain React Native handles poorly: a settings screen, grouped form,
  native picker, context menu, action/bottom sheet, segmented control, toggle, slider, or any
  Host/RNHostView tree. Also when choosing universal ('@expo/ui') vs platform-specific
  ('@expo/ui/swift-ui', '@expo/ui/jetpack-compose') components, applying SwiftUI/Compose
  modifiers, swapping an RN community library for an '@expo/ui/community/*' drop-in, or fixing
  'Unable to get view config' crashes. Not for custom native modules, Expo Router navigation,
  Reanimated, or data fetching.
license: MIT
allowed-tools: "Bash(node *expo-ui-full-reference/scripts/*.js *)"
metadata:
  version: "1.1.0"
---

# Expo UI Full Reference (`@expo/ui`)

The complete `@expo/ui` reference: every layer (universal, SwiftUI, Jetpack Compose), the full
modifier catalogs, drop-in replacements, screen templates, and tooling. Read the mental model
below, then load the one reference file the task needs (map at the bottom).

`@expo/ui` renders **real native UI from React**: SwiftUI views on iOS, Jetpack Compose on
Android. It is a *primitives* library (like `<div>`/`<span>` for the OS), not a styled design
kit. Reach for it when you want controls that look and behave exactly like the system: settings
forms, pickers, sheets, menus, toggles, sliders. Keep plain React Native `View`/`Text`
(NativeWind, flexbox) for custom-branded, heavily-styled UI. The two mix freely at the
component level.

## Mental model (the one thing to get right)

Every `@expo/ui` tree is an **island of native UI** bridged into your RN tree by a **`Host`**.
Think of `Host` like `<svg>` in the DOM or `<Canvas>` in Skia: the bridge boundary. This drives
the #1 rule agents get wrong:

> **Flexbox / Yoga styles apply to the `Host` only. Inside a Host, there is no Yoga.**
> Lay out children with native primitives and their props/modifiers, never with RN
> `style={{ flex, flexDirection, justifyContent, alignItems, gap }}`:
> - Universal/SwiftUI: `Row`/`Column`/`HStack`/`VStack` with `spacing` + `alignment`.
> - Compose: `Row`/`Column` with `horizontalArrangement`/`verticalArrangement` +
>   `modifiers={[...]}` from `@expo/ui/jetpack-compose/modifiers`.
> Putting `style={{ flex: 1 }}` on a `Button`/`Text`/`Row` inside a Host is a no-op or a bug.
> `scripts/audit-expo-ui.js` catches this automatically.

`Host` is **always imported from the `@expo/ui` root**, even when its children are
platform-specific. `Host` itself takes either `matchContents` (size to content, best for inline
widgets) or `style={{ flex: 1 }}` / explicit size (required when it wraps a scrollable like
`List`, `ScrollView`, `LazyColumn`).

## Choosing a layer (stop at the first that fits)

1. **Universal first**: import from `@expo/ui`. One tree runs unmodified on iOS, Android, and
   web (web is experimental). No `.ios.tsx`/`.android.tsx` split. Covers the common kit: layout,
   `Text`, `Icon`, `Button`, `Switch`, `Checkbox`, `Slider`, `TextInput`, `Picker`,
   `BottomSheet`, `Collapsible`, `List`, `FieldGroup`. → `references/universal.md`
2. **Platform-specific**: import from `@expo/ui/swift-ui` (iOS) or `@expo/ui/jetpack-compose`
   (Android). Use **only** when universal lacks the component, modifier, or platform behavior you
   need (e.g. SwiftUI `Form`/`ContextMenu`/`glassEffect`, Compose
   `DockedSearchBar`/`FloatingActionButton`/Material 3). **Cost:** two trees and a file split.
   → `references/swift-ui.md`, `references/jetpack-compose.md`
3. **Drop-in replacements**: `@expo/ui/community/<name>`. A *migration side-path* for swapping
   out an RN community UI dependency (`@gorhom/bottom-sheet`,
   `@react-native-community/datetimepicker`, ...), not part of the decision above.
   → `references/drop-in-replacements.md`

## Rules agents get wrong (read before writing code)

- **Platform packages crash on the wrong OS.** Importing `@expo/ui/swift-ui` on Android or
  `@expo/ui/jetpack-compose` on iOS throws `Unable to get view config`. Isolate platform trees
  in `.ios.tsx` / `.android.tsx` files under `components/` (never inside `app/`, where Expo
  Router rejects platform suffixes on route files with a "no fallback sibling" error), or guard
  with `Platform.OS`. Re-export from a plain route file.
- **The callback prop name differs by layer.** Universal `Button` and SwiftUI `Button` use
  `onPress`; Compose `Button` uses `onClick`. Don't assume.
- **`TextInput`/`TextField` value is not a plain string** when using `useNativeState`: it takes
  an `ObservableState` for flicker-free worklet updates, and needs `react-native-worklets`. See
  the universal/platform references.
- **`List` / `LazyColumn` items run on the JS thread** (each row is a JSX node): fine for
  settings-sized lists, not for large data sets.
- **Modifiers mirror native APIs.** Apple/Google sample code is roughly a search-and-replace
  away. Apply them via the `modifiers={[...]}` prop (order matters), importing from
  `@expo/ui/swift-ui/modifiers` or `@expo/ui/jetpack-compose/modifiers`.

## SDK gating (confirm against the installed version)

- **Universal layer needs SDK 56+.** Platform-specific (`swift-ui`, `jetpack-compose`) and
  drop-ins also work on **SDK 55**.
- On **SDK 56+**, `@expo/ui` ships in Expo Go, so `npx expo start` runs it directly. On **SDK
  55**, build a dev client (`npx expo run:ios` / `run:android`).

## Source of truth: this skill is a fast map, not the territory

`@expo/ui` is versioned with the Expo SDK and its props/modifiers shift between cycles, so the
tables here are a **fast map keyed to SDK 56**, never the authority. When the map is ambiguous,
looks stale, conflicts with what is installed, or is missing a component / prop / modifier you
need, stop guessing and confirm against the real source, in this order of authority:

1. **The installed package** (authoritative for the project's version). Prop shapes live in
   `node_modules/@expo/ui/build/<layer>/<Component>/index.d.ts`. Enumerate what is installed:
   ```bash
   node <skill-root>/scripts/list-components.js <project-path>          # component + modifier names
   node <skill-root>/scripts/list-components.js <project-path> --docs   # + one-line modifier descriptions
   ```
2. **The docs, matched to the project's SDK.** Expo serves agent-friendly Markdown: append
   `/index.md` to any page, e.g.
   `https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/button/index.md`. `versions/latest`
   tracks the newest SDK (**57** as of writing), so if the project is on 56 use
   `https://docs.expo.dev/versions/v56.0.0/...` to match. Full page index:
   `https://docs.expo.dev/llms.txt`; UI overview: `.../sdk/ui/index.md`.

Installed types win over the docs; the docs win over this map. Never invent a prop or modifier
to fill a gap: confirm it exists first.

## Reference map (load only the one you need)

```
references/
  universal.md                  '@expo/ui' cross-platform components, START HERE (SDK 56+)
  swift-ui.md                   '@expo/ui/swift-ui' iOS components (SDK 55+, iOS only)
  swift-ui-modifiers.md         full SwiftUI modifier catalog (~95), load for any non-obvious modifier
  jetpack-compose.md            '@expo/ui/jetpack-compose' Android components (SDK 55+, Android only)
  jetpack-compose-modifiers.md  full Compose modifier catalog
  drop-in-replacements.md       '@expo/ui/community/*' API-compatible swaps (migration side-path)
assets/
  universal-screen.tsx          copy-paste universal settings screen (Expo Router)
  swiftui-screen.ios.tsx        copy-paste SwiftUI-only screen
  compose-screen.android.tsx    copy-paste Compose-only screen
  install.md                    install + config snippet
scripts/
  list-components.js            enumerate components/modifiers in the *installed* version
  audit-expo-ui.js              flag flexbox-on-@expo/ui and avoidable platform imports
```

A task touching one platform pulls in **only that one reference file**. Shared concepts (Host,
the flexbox rule, the layer decision, SDK gating, source of truth) live here and are not
repeated in the references.
