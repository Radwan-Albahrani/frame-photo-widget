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

## The navigation theme is what makes the BARS dark

This cost several rebuilds. There are **two** independent switches, and the app looks half-broken
until both are on:

1. `userInterfaceStyle: "dark"` in `app.json` → `UIUserInterfaceStyle = Dark` in the Info.plist.
   This covers the app's own trait collection.
2. **react-navigation's `ThemeProvider` with `DarkTheme`**, wrapped around the root `Stack` in
   `app/_layout.tsx`. Without it expo-router falls back to the LIGHT navigation theme, and
   react-native-screens then configures every nav bar — and the Liquid Glass capsule behind each
   toolbar button — in light appearance.

The symptom of missing (2) is unmistakable and misleading: the app background, text and tab bar are
all correctly dark, but the header's toolbar buttons sit in a **light grey capsule** with a dark
glyph. No amount of `headerTintColor`, `headerBlurEffect` or `headerTransparent` fixes it, because
those style the bar's contents rather than its appearance mode. Do not reach for
`hidesSharedBackground` to hide the evidence.

```tsx
const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.surface, card: colors.surface },
};

<ThemeProvider value={NAV_THEME}>
  <Stack ... />
</ThemeProvider>
```

Keep the header options minimal on top of that (`headerLargeTitle`, a tint, a title colour). Layering
`headerTransparent` + `headerBlurEffect` on a large-title screen produced an empty grey band with no
title at all.

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

## iPhone Duo: the side bar, the fold and the grids

iPhone Duo needs **Xcode 27.1** (the iOS 27.1 SDK). Built with an older SDK, the app is letterboxed in the
middle of the inner display instead of filling it. Test on the iPhone Duo simulator in Device Hub, which
can fold it to any angle.

Outside inner-display portrait, iOS moves the status bar, the tab bar and the toolbar into a vertical
**side bar** on one edge. It reports that bar as a left or right safe-area inset, about 84pt. `NativeTabs`,
`Stack` and the `@expo/ui` Form screens lay themselves out around it. Our own React Native content does
not:

- `contentInsetAdjustmentBehavior="automatic"` handles the top and bottom only. It does not yet add
  the left and right insets ([react-native#59194](https://github.com/facebook/react-native/pull/59194)).
  Until that ships, every full-width `ScrollView` pads its content with `useContentFrame()`'s `left`
  and `right`. **When the React Native patch lands, remove the manual padding**, or the side bar's
  width gets added twice.
- Size from `useContentFrame().width` (the window width minus both side insets), read at render time.
  Never cache it: folding, unfolding and Split View all resize the window.
- Floating views position themselves from the insets (`frame.bottom`, `frame.left - frame.right`),
  not fixed offsets.

The photo grid and the album grid come from `gridLayout()` in `src/ui/layout/grid.ts`:

- **Phones keep their old layout exactly**: 3 photo columns and 2 album columns, at the same sizes as
  before. A unit test pins this.
- **Wide windows use an even number of columns**, so the fold lands in a gutter instead of
  through a photo.
- **Partly open, the hinge gutter widens.** `FoldRegion` reads the active `division` region from
  `react-native-reserved-regions`, and `gridLayout()` splits the columns in half, one half on each
  side, so no cell sits on the bend. The library reports only *active* regions, and the fold is
  active only when the phone is partly open. Flat, it reports nothing and the grid is a plain even
  grid.
- iOS does not let you test widgets or most other extensions on the iPhone Duo simulator. Check
  them on a device.
