# expo-ui-full-reference

[![skills.sh](https://skills.sh/b/AlshehriAli0/agent-skills/expo-ui-full-reference)](https://skills.sh/AlshehriAli0/agent-skills/expo-ui-full-reference)

> Part of [`AlshehriAli0/agent-skills`](https://github.com/AlshehriAli0/agent-skills) — see the [root README](../../README.md) for the full skill index.

The complete agent reference for [`@expo/ui`](https://docs.expo.dev/versions/latest/sdk/ui/) — rendering **real native UI from React**: SwiftUI views on iOS, Jetpack Compose on Android. It teaches Claude / Cursor / any agent the mental model (`Host` islands, no Yoga inside a Host), how to choose between the universal, platform-specific, and drop-in layers, the full modifier catalogs, and the rules agents get wrong (platform-package crashes, callback-prop differences, SDK gating). Keyed to **SDK 56**.

`@expo/ui` is a *primitives* library — `<div>`/`<span>` for the OS, not a styled design kit. Reach for it for controls that look and behave exactly like the system (settings forms, pickers, sheets, menus, toggles, sliders); keep plain RN `View`/`Text` for custom-branded UI. The skill keeps the agent from guessing props from memory — it points at the installed `.d.ts` and the latest docs as the source of truth.

## Install

```bash
npx skills add AlshehriAli0/agent-skills@expo-ui-full-reference -g
```

`-g` installs globally. Drop it for project-local. See the [skills CLI docs](https://github.com/vercel-labs/skills) for all flags.

## What's inside

```
.
├── SKILL.md                            # Mental model, layer decision tree, the rules agents get wrong, SDK gating
├── references/                         # Load only the one the task needs
│   ├── universal.md                    # '@expo/ui' cross-platform components — START HERE (SDK 56+)
│   ├── swift-ui.md                     # '@expo/ui/swift-ui' iOS components (SDK 55+)
│   ├── swift-ui-modifiers.md           # full SwiftUI modifier catalog (~95)
│   ├── jetpack-compose.md              # '@expo/ui/jetpack-compose' Android components (SDK 55+)
│   ├── jetpack-compose-modifiers.md    # full Compose modifier catalog
│   └── drop-in-replacements.md         # '@expo/ui/community/*' API-compatible swaps (migration side-path)
├── assets/                             # Copy-paste starting points
│   ├── universal-screen.tsx            # universal settings screen (Expo Router)
│   ├── swiftui-screen.ios.tsx          # SwiftUI-only screen
│   ├── compose-screen.android.tsx      # Compose-only screen
│   └── install.md                      # install + config snippet
└── scripts/
    ├── list-components.js              # enumerate components/modifiers in the *installed* version
    └── audit-expo-ui.js                # flag flexbox-on-@expo/ui and platform imports with a universal equivalent
```

## When this skill triggers

Any task building or reviewing native-feeling UI that plain React Native handles poorly — a settings screen, grouped form, native picker, context menu, action/bottom sheet, segmented control, toggle, slider, or any `Host`/`RNHostView` tree. Also when choosing universal vs platform-specific components, applying SwiftUI/Compose modifiers, or fixing `Unable to get view config` crashes. Not for custom native modules, Expo Router navigation, Reanimated, or data fetching.

## The mental model in 30 seconds

- Every `@expo/ui` tree is an **island of native UI** bridged in by a **`Host`** (always imported from the `@expo/ui` root).
- **Flexbox / Yoga applies to the `Host` only — there is no Yoga inside it.** Lay out children with native primitives (`Row`/`Column`/`HStack`/`VStack` + `spacing`/`alignment`/arrangement), never RN `style={{ flex, flexDirection, … }}`.
- **Universal first** (`@expo/ui`) — one tree, all platforms. Drop to **platform-specific** (`@expo/ui/swift-ui` / `@expo/ui/jetpack-compose`) only when universal lacks what you need; **drop-ins** (`@expo/ui/community/*`) are a migration side-path.
- **Platform packages crash on the wrong OS** — isolate in `.ios.tsx` / `.android.tsx` (under `components/`, never `app/`) or guard with `Platform.OS`.
- **Callback prop names differ by layer** — universal/SwiftUI `Button` use `onPress`; Compose `Button` uses `onClick`.
- **Modifiers mirror native APIs** — applied via `modifiers={[...]}` (order matters) from `@expo/ui/<layer>/modifiers`.
- Universal layer needs **SDK 56+**; platform-specific and drop-ins also work on **SDK 55**. The installed package's TypeScript types are the source of truth.

Read [`SKILL.md`](./SKILL.md) for the full decision tree, rules, and reference map.

## Tooling

```bash
node scripts/list-components.js <project-path>          # what's installed (names)
node scripts/list-components.js <project-path> --docs   # + modifier descriptions
node scripts/audit-expo-ui.js <path-to-src>             # flag flexbox-on-Host and avoidable platform imports
```

## License

MIT — see the [root LICENSE](../../LICENSE).
