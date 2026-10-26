# Platform-specific iOS UI: `@expo/ui/swift-ui`

> **iOS only. SDK 55+.** Importing this on Android crashes with `Unable to get view config`.
> Read `../SKILL.md` first (Host, flexbox rule, decision tree, SDK gating). Use this layer
> only when universal (`./universal.md`) lacks what you need.

Components import from `@expo/ui/swift-ui`; modifiers from `@expo/ui/swift-ui/modifiers`.
**`Host` always imports from `@expo/ui`.** The API mirrors SwiftUI 1:1 — Apple's component,
prop, and modifier names map across almost verbatim, so SwiftUI sample code is roughly a
search-and-replace away.

```tsx
import { Host } from '@expo/ui';
import { List, Section, Toggle, Picker, Text } from '@expo/ui/swift-ui';
import { listStyle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

<Host style={{ flex: 1 }}>
  <List modifiers={[listStyle('insetGrouped')]}>
    <Section title="General">
      <Toggle label="Wi-Fi" isOn={wifi} onIsOnChange={setWifi} />
      <Picker label="Theme" selection={theme} onSelectionChange={setTheme} modifiers={[pickerStyle('menu')]}>
        {themes.map((t, i) => <Text key={t} modifiers={[tag(i)]}>{t}</Text>)}
      </Picker>
    </Section>
  </List>
</Host>;
```

## File placement with Expo Router

Do **not** put `.ios.tsx` files inside `app/` — Expo Router rejects platform suffixes on
route files ("no fallback sibling" Render Error). Put the SwiftUI tree in
`components/Foo.ios.tsx` and re-export it from a plain route file:

```tsx
// components/ProfileEditor.ios.tsx → the SwiftUI tree
// app/profile-editor.tsx:
import ProfileEditor from '../components/ProfileEditor';
export default ProfileEditor;
```

Or keep one route file and guard the import with `Platform.OS === 'ios'`.

## Components (verify exact props against the installed `.d.ts`)

Props marked **✓** are verified against current docs; others list the SwiftUI-equivalent key
props — confirm on your version. All accept `modifiers` + `CommonViewModifierProps`.

| Component | Key props / usage | Notes & gotchas |
|-----------|-------------------|-----------------|
| `Host` | from `@expo/ui` root | Bridge. `matchContents` or `style={{ flex: 1 }}` for scrollables. |
| `VStack` / `HStack` | `spacing?`, `alignment?`, `children` ✓ | Vertical / horizontal layout. The flexbox replacement inside a Host. |
| `ZStack` | `alignment?`, `children` | Overlapping/stacked layout. |
| `Spacer` | `minLength?` | Flexible space. |
| `Group` | `children` | Groups views without affecting layout. |
| `ScrollView` | `children` | Scrollable; wrap Host in `flex: 1`. |
| `Text` | `children` ✓ | Styled native text; nestable. Style via modifiers. |
| `Label` | `title: string`, `systemImage: SFSymbol` ✓ | Text + leading SF Symbol. |
| `Image` | `systemName: SFSymbol` ✓ | Renders an SF Symbol. |
| `Button` | `label?: string`, `onPress`, `systemImage?: SFSymbol`, `role?: 'default'\|'cancel'\|'destructive'`, `children?` ✓ | **`onPress`** (not `onClick`). `children` for custom label (elements only, no bare string). Style via `buttonStyle`/`controlSize`/`tint`/`labelStyle`/`disabled`. |
| `Toggle` | `label`, `isOn: boolean`, `onIsOnChange` ✓ | iOS switch. Note `isOn`/`onIsOnChange`, **not** `value`/`onValueChange`. |
| `Slider` | `value: number`, `onValueChange`, `min?`, `max?`, `step?` | Range selector. |
| `Picker` | `selection: T`, `onSelectionChange`, `label?`, `systemImage?`, `children` (Text + `tag()` modifier) ✓ | Style via `pickerStyle('segmented'\|'menu'\|'wheel')`. **No `options`/`selectedIndex`** — selection is by child `tag`. |
| `DatePicker` | `selection` (date), `onDateSelected`, `displayedComponents?`, `title?` | Was `DateTimePicker` pre-55. Range support. |
| `ColorPicker` | `selection` (color), `onValueChanged`, `label?`, `supportsOpacity?` | Native color picker. |
| `TextField` | `placeholder?`, `defaultValue?` / `value` (`useNativeState`), `onChangeText`, `keyboardType?` ✓ | With `useNativeState`, `value` is `ObservableState` (see below). |
| `SecureField` | `placeholder?`, `value`, `onChangeText` | Password input (masked `TextField`). |
| `List` | `children` (rows / `Section`s), `selection?: (string\|number)[]`, `onSelectionChange?` ✓ | Use `<Host style={{ flex: 1 }}>`. Reorder/delete via `List.ForEach` (`onDelete(indices)`, `onMove(src, dest)`). Style via `listStyle` + `listRow*` modifiers. JS-thread rows — not for huge data. |
| `Section` | `title?`, `isExpanded?`, `children` ✓ | Groups rows in a `List`/`Form`. |
| `Form` | `children` | Inset-grouped form container. Scroll control via `scrollDisabled` modifier. |
| `DisclosureGroup` | `label`, `isExpanded?`, `onStateChange?`, `children` | Expand/collapse section. |
| `Menu` | `children` (actions / nested `Menu`) | Tap-to-open dropdown menu of actions. |
| `ContextMenu` | `children` + `activationMethod?: 'longPress'\|'singleTap'` | Long-press context menu wrapping content. |
| `ConfirmationDialog` | `isPresented`, `onDismiss`, `title?`, actions | Action-sheet-style confirmation. |
| `Alert` | `isPresented`, `title`, `message?`, actions | Native iOS alert. |
| `Popover` | `isPresented`, `children` | Floating overlay anchored to a view. |
| `BottomSheet` | `isOpened: boolean`, `onIsOpenedChange`, `children` | iOS sheet presentation. |
| `Overlay` | `children` | Layers content on top of another view. |
| `Link` | `destination` (URL), `children` | Opens a link. |
| `Gauge` | `value`, `min?`, `max?`, `label?`, `currentValueLabel?` | Progress with min/max/current labels. iOS. |
| `ProgressView` | `value?`, `total?` | Determinate/indeterminate progress. Replaced Circular/Linear; style via `progressViewStyle`. |
| `ControlGroup` | `children` | Groups related controls (e.g. toolbar buttons). |
| `SwipeActions` | leading/trailing actions + `children` | Adds swipe actions to a row. |
| `TabView` | `children` (tabs) | Paged / tabbed content. |
| `LazyVStack` / `LazyHStack` | `spacing?`, `children` | Lazy stacks for long scrollable runs. |
| `Divider` | — | Visual separator. |
| `Namespace` | `children` | Creates a SwiftUI namespace (matched geometry). |
| `AccessoryWidgetBackground` | — | Standard widget accessory background (WidgetKit). |
| `RNHostView` | `matchContents?`, `children` | Embeds RN components inside this SwiftUI tree (see below). |

## Modifiers (`@expo/ui/swift-ui/modifiers`, applied via `modifiers={[...]}`, order matters)

Most-used, by area. **Full catalog (~95 modifiers) is in `swift-ui-modifiers.md`** — load it
when you need anything beyond these.

| Area | Common modifiers |
|------|------------------|
| Layout/size | `frame(...)`, `padding(...)`, `offset(...)` |
| Appearance | `background(color, shape?)`, `cornerRadius(n)`, `foregroundStyle(...)`, `tint(color)`, `opacity(n)`, `shadow({...})`, `glassEffect(...)` (iOS 26+) |
| Controls | `buttonStyle(...)`, `controlSize(...)`, `labelStyle(...)`, `pickerStyle(...)`, `disabled(bool?)` |
| List/row | `listStyle(...)`, `listRowBackground(color)`, `listRowSeparator(...)`, `listRowInsets({...})`, `refreshable(handler)`, `scrollDismissesKeyboard(mode)`, `headerProminence(...)` |
| Selection/edit | `tag(value)`, `environment('editMode', ...)`, `moveDisabled(bool)`, `deleteDisabled(bool)` |
| Gesture/text | `onTapGesture(handler)`, `font({...})`, `multilineTextAlignment(...)`, `lineLimit(...)` |

## `RNHostView` — embedding RN inside SwiftUI

Wrap any React Native child in `RNHostView`. Expo auto-creates a `UIViewRepresentable`.
**Caveat (Apple):** SwiftUI controls the wrapped view's layout (center/bounds/frame/
transform) — don't set those from RN, and note that once you render RN children you've left
the SwiftUI layout context.

```tsx
import { Host } from '@expo/ui';
import { VStack, RNHostView } from '@expo/ui/swift-ui';
import { Pressable } from 'react-native';

<Host matchContents>
  <VStack>
    <RNHostView matchContents><Pressable /></RNHostView>
  </VStack>
</Host>;
```

## `useNativeState`

Observable state that updates synchronously on the UI thread via worklets — immediate
native updates with no React render. Requires `react-native-worklets`; without it updates
fall back to React and flicker. Best for real-time inputs (mask/format as the user types).
`ObservableState.value` is read/written from worklets; `onChange` fires a worklet listener.
Docs: `https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/usenativestate/index.md`.

## Missing a View or modifier?

Extend Expo UI with a local Expo module (`ViewModifierRegistry.register(...)`, custom
`ExpoSwiftUI.View`). Confirm with the user before adding native code. Guide:
`https://docs.expo.dev/guides/expo-ui-swift-ui/extending/index.md`.
