# Install & config — `@expo/ui`

## Install

```bash
npx expo install @expo/ui
```

`@expo/ui` is versioned with the SDK — `npx expo install` picks the version matching your
`expo`. In an existing (bare) RN app, make sure `expo` itself is installed and configured
first (`npx install-expo-modules`).

For synchronous, flicker-free `useNativeState` inputs, also install worklets:

```bash
npx expo install react-native-worklets
```

## Run

- **SDK 56+:** `@expo/ui` is included in Expo Go — `npx expo start` runs it with no custom
  build.
- **SDK 55:** not in Expo Go — build a dev client: `npx expo run:ios` / `npx expo run:android`
  (or an EAS dev build).

## Verify what's installed (do this before writing code)

```bash
# from the skill root
node scripts/list-components.js <project-path>          # components + modifiers (names)
node scripts/list-components.js <project-path> --docs    # + one-line modifier descriptions
```

The printed version + component list reflect *your* installed package — trust it over the
docs (which track latest) and over any table. For exact prop shapes, read
`node_modules/@expo/ui/build/<layer>/<Component>/index.d.ts`.

## No config plugin needed

`@expo/ui` requires no `app.json` plugin entry for the built-in components. You only touch
native config when **extending** Expo UI with custom SwiftUI/Compose views via a local Expo
module (enable the Compose compiler in `android/build.gradle`; add the `ExpoUI` pod
dependency on iOS) — see the extending guides, and confirm with the user before adding
native code.
