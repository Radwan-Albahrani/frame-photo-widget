# Native UI

Frame uses the real native iOS components, not replicas. Liquid Glass, large titles, toolbars and
form rows all already exist natively; anything hand-drawn here would be a worse copy that stops
tracking the OS.

| Surface | What draws it |
|---|---|
| Tab bar | `NativeTabs` from `expo-router/unstable-native-tabs` (a real `UITabBar`) |
| Screen titles | `Stack.Screen.Title` with `headerLargeTitle` |
| Header buttons / menus | `Stack.Toolbar.Button`, `Stack.Toolbar.Menu` |
| Settings | SwiftUI `Form` / `Section` / `Picker` / `Toggle` via `@expo/ui/swift-ui` |
| Destructive confirm | SwiftUI `ConfirmationDialog` (`src/ui/components/overlays/ConfirmDialog.tsx`) |
| Album name entry | a native `formSheet` route (`app/(tabs)/(albums)/name.tsx`) |

## A bare string inside an `@expo/ui` slot CRASHES the app

This one presents as a launch crash with no useful JS stack, so it is worth recognising on sight.

`Section`'s `footer`/`header` and `ConfirmationDialog.Message` are typed `React.ReactNode`. Passing a
plain string looks fine and type-checks, but React Native then tries to mount a `RawText` node with
no `<Text>` host around it. Metro logs a warning that is easy to scroll past:

```
ERROR  Text strings must be rendered within a <Text> component.
```

and the app dies on the splash screen with a native exception that never names your code:

```
*** Terminating app due to uncaught exception 'NSInternalInconsistencyException',
    reason: 'ComponentView with componentHandle `4497531188` (`RawText`) not found.'
```

**Always wrap the value in `<Text>` from `@expo/ui/swift-ui`** (not the React Native `Text`, and not
Frame's own `Text`) when it is the child or a `ReactNode` prop of a SwiftUI component:

```tsx
<Section footer={<Text>{SOURCE_FOOTER[source]}</Text>}>
```

A `label` prop typed `string` is fine as a plain string, because it is bridged as a prop rather than
mounted as a child. The rule is about children and `ReactNode` props only.

## Dark mode is forced, not preferred

`userInterfaceStyle: "dark"` is set on both `expo` and `expo.ios` in `app.json`, which writes
`UIUserInterfaceStyle = Dark` into the generated Info.plist. That is what makes the *native* chrome
(tab bar, Form rows, sheets, pickers) render dark — a React-side colour cannot reach them.

**Changing `userInterfaceStyle` requires a prebuild plus a rebuild.** Editing `app.json` alone leaves
the old `UIUserInterfaceStyle = Automatic` in `ios/Frame/Info.plist`, and the tab bar keeps rendering
light on a dark app while every React-drawn surface looks correct. If the native chrome disagrees
with the app, check that key first:

```bash
grep -A2 UIUserInterfaceStyle ios/Frame/Info.plist
```

## Never set `backgroundColor` on `NativeTabs`

It replaces the Liquid Glass material with a flat fill. Set `tintColor` for the selected item and
leave the background alone.
