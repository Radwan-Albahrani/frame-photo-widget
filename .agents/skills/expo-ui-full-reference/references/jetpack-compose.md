# Platform-specific Android UI: `@expo/ui/jetpack-compose`

> **Android only. SDK 55+.** Importing this on iOS crashes with `Unable to get view config`.
> Read `../SKILL.md` first (Host, flexbox rule, decision tree, SDK gating). Use this layer
> only when universal (`./universal.md`) lacks what you need.

Components import from `@expo/ui/jetpack-compose`; modifiers from
`@expo/ui/jetpack-compose/modifiers`. **`Host` always imports from `@expo/ui`.** The API
mirrors Jetpack Compose + Material 3 1:1 — composable, prop, and modifier names map across,
so Google/M3 sample code is roughly a search-and-replace away.

```tsx
import { Host } from '@expo/ui';
import { Column, Text, Button, Switch } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';

<Host matchContents>
  <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth(), paddingAll(16)]}>
    <Text style={{ typography: 'titleLarge' }}>Settings</Text>
    <Switch value={on} onValueChange={setOn} />
    <Button onClick={save}>Save</Button>
  </Column>
</Host>;
```

## File placement with Expo Router

Do **not** put `.android.tsx` files inside `app/` — Expo Router rejects platform suffixes on
route files. Put the Compose tree in `components/Foo.android.tsx` and re-export from a plain
route file (`import Foo from '../components/Foo'; export default Foo;`), or guard the import
with `Platform.OS === 'android'`.

## `Host` props (Compose-specific — verified)

| Prop | Type | Notes |
|------|------|-------|
| `matchContents` | `boolean \| {vertical?, horizontal?}` | Sizes the RN view to the Compose content. **Do not use on the same axis as a scrollable** (`LazyColumn`/`LazyRow`/`Carousel`/`*Scroll`) — scrollables need a finite max constraint and `matchContents` propagates an unbounded one, which crashes. Fix: drop it on the scroll axis, or give the Host a finite size via `style`. |
| `style` | RN style | Flexbox applies **here only**. Use `style={{ flex: 1 }}` when wrapping `LazyColumn`. |
| `colorScheme` | `'light' \| 'dark'` | Omit to follow device. Palette follows wallpaper (Material You, Android 12+) unless `seedColor` set. |
| `seedColor` | color | Seeds a Material 3 palette (`SchemeTonalSpot`), exposed to children via `useMaterialColors()`. |
| `useViewportSizeMeasurement` | boolean | When true and no explicit size, proposes the viewport size to Compose layout. |
| `layoutDirection` | `'leftToRight' \| 'rightToLeft'` | Defaults to `I18nManager` locale direction. |
| `onLayout` | callback | Fires with content dimensions on layout. |

## Components (verify exact props against the installed `.d.ts`)

Props marked **✓** verified against current docs; others list the Compose/M3-equivalent key
props — confirm on your version. Most accept `modifiers`.

| Component | Key props / usage | Notes & gotchas |
|-----------|-------------------|-----------------|
| `Column` | `verticalArrangement?: {spacedBy}`, `horizontalAlignment?`, `modifiers?`, `children` ✓ | Vertical layout — the flexbox replacement. |
| `Row` | `horizontalArrangement?: {spacedBy}`, `verticalAlignment?`, `modifiers?`, `children` ✓ | Horizontal layout. |
| `Box` | `modifiers?`, `children` | Stacks children (like `ZStack`). |
| `Spacer` | via `size`/`weight` modifiers | Flexible space. |
| `Surface` | `modifiers?`, `children` | M3 styled container (elevation, color, shape). |
| `Card` | `modifiers?`, `children` | M3 card container. |
| `Text` | `children`, `style={{ typography: 'titleLarge'\|... }}` ✓ | Style via the `typography` token, not RN text styles. |
| `Icon` | `source={require('./x.xml')}`, `size?`, `tint?`, `contentDescription` ✓ | Android XML vector drawables; or `@expo/material-symbols` (`import Home from '@expo/material-symbols/home.xml'`). Metro bundles `.xml` automatically. |
| `IconButton` | `onClick`, `modifiers?`, `children` (Icon) | M3 icon button. |
| `Button` | `onClick`, `children`, variant components | **`onClick`** (not `onPress`). Family includes filled/outlined/text/elevated/tonal variants. |
| `FloatingActionButton` | `onClick`, `children` | M3 FAB. |
| `ToggleButton` | `checked`, `onCheckedChange`, `children` | M3 toggle button. |
| `Switch` | `value: boolean`, `onValueChange` | Toggle control. |
| `Checkbox` | `value: boolean`, `onValueChange` | Selection control. |
| `RadioButton` | `selected: boolean`, `onValueChange` | Single-selection control. |
| `Slider` | `value: number`, `onValueChange`, `steps?` | Range selector. |
| `SegmentedButton` | options + `onValueChange`, single/multi | Single- or multi-choice segmented control. |
| `Chip` | `onClick?`, `label`/`children`, variant | Compact assist/filter/input/suggestion chip. |
| `TextField` | `value`/`defaultValue`, `onChangeText`, `label?` | With `useNativeState`, `value` is `ObservableState` (see below). |
| `DateTimePicker` | `value`/`selection`, `onChange`, `mode?` | Date/time selection. |
| `DropdownMenu` | `expanded`, `onDismiss`, `children` | Dropdown menu of items. |
| `ExposedDropdownMenuBox` | `expanded`, anchor + menu `children` | Dropdown with a customizable anchor (combobox). |
| `Tooltip` | anchor + `children`, long-press content | M3 tooltip on long-press. (Compose has no standalone `Menu` — use `DropdownMenu`.) |
| `AlertDialog` / `BasicAlertDialog` | `visible`/`onDismiss`, title, buttons / custom content | Native M3 alert dialog (Basic = custom content). |
| `Progress` | `progress?` (0..1; omit/`null` for indeterminate), variant | M3 circular/linear progress indicator. |
| `Snackbar` | `visible`, `message`, action | Brief bottom feedback message. |
| `ModalBottomSheet` | `isOpened`, `onStateChange`, `children` | Sheet from the bottom (imported as the `bottomsheet` page). |
| `NavigationBar` | items + selection | M3 bottom navigation. |
| `SearchBar` / `DockedSearchBar` | `query`, `onQueryChange`, results | Full / inline M3 search. No universal equivalent. |
| `HorizontalPager` | `pageCount`, `onPageChange`, `children` | Swipeable pages. Wrap Host in `flex: 1`. |
| `Carousel` | items, `children` | Scrollable item carousel. **Scroll axis: don't `matchContents`.** |
| `LazyColumn` | `children` (rows) | Use instead of RN `ScrollView`/`FlatList`. **Wrap Host in `style={{ flex: 1 }}`.** JS-thread rows — not for huge data. |
| `LazyRow` | `children` | Horizontally scrolling lazy list. |
| `ListItem` | headline/supporting/leading/trailing | Structured M3 list row. |
| `FlowRow` | `children` | Wraps children onto new lines horizontally. |
| `PullToRefreshBox` | `isRefreshing`, `onRefresh`, `children` | Pull-to-refresh wrapper. |
| `HorizontalFloatingToolbar` | actions | Floating action toolbar. |
| `Badge` / `BadgedBox` | count/content / anchor + badge | Status badge / overlay badge on content. |
| `Divider` | orientation | Visual separator. |
| `Shape` | shape params | Draws a geometric shape. |
| `RNHostView` | `matchContents?`, `children` | Embeds RN components inside this Compose tree. |

## Modifiers (`@expo/ui/jetpack-compose/modifiers`, via `modifiers={[...]}`, order matters)

Order changes results (padding-before-background ≠ reverse). Most-used below; **full table
with signatures is in `jetpack-compose-modifiers.md`**.

| Area | Common modifiers |
|------|------------------|
| Size | `size(w,h)`, `width(n)`, `height(n)`, `fillMaxWidth(frac?)`, `fillMaxHeight(frac?)`, `fillMaxSize(frac?)`, `wrapContentWidth()`, `wrapContentHeight()`, `weight(n)` |
| Spacing | `paddingAll(n)`, `padding(start,top,end,bottom)`, `offset(x,y)` |
| Appearance | `background(color)`, `border(width,color)`, `shadow(elevation)`, `alpha(n)`, `blur(n)` |
| Transform | `rotate(deg)`, `zIndex(n)` |
| Interaction | `clickable(handler)`, `onVisibilityChanged(...)` |

Material 3 dynamic colors: `useMaterialColors()` (seeded via Host `seedColor`/`colorScheme`) —
`.../jetpack-compose/colors/index.md`.

## `useNativeState`

Same as on SwiftUI: observable state updated synchronously on the UI thread via worklets
(needs `react-native-worklets`). `ObservableState.value` is read/written from worklets;
`onChange` fires a worklet listener. Best for flicker-free controlled `TextField`s.
Docs: `https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/usenativestate/index.md`.

## Missing a composable or modifier?

Extend with a local Expo module (`createModifier(...)`, `createViewModifierEventListener`,
enable the Compose compiler in `android/build.gradle`). Confirm with the user before adding
native code. Guide: `https://docs.expo.dev/guides/expo-ui-jetpack-compose/extending/index.md`.
