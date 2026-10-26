# Universal `@expo/ui` components

> **SDK 56+.** Runs on iOS (→ SwiftUI), Android (→ Jetpack Compose), and web
> (`react-native-web`/`react-dom`, experimental). One tree, no `.ios.tsx`/`.android.tsx`
> split. Read `../SKILL.md` first for the Host + flexbox rule and the decision tree — not
> repeated here.

All components below import from the `@expo/ui` **root**, including `Host`. Wrap every tree
in `Host` (`matchContents`, or `style={{ flex: 1 }}` when wrapping a scrollable). Layout is
done with `Row`/`Column` + `spacing`/`alignment`, **never** RN flexbox `style` on children.

```tsx
import { Host, Column, Text, Button, Switch } from '@expo/ui';

<Host matchContents>
  <Column spacing={12} alignment="leading">
    <Text>Settings</Text>
    <Switch value={on} onValueChange={setOn} label="Wi-Fi" />
    <Button onPress={save}>Save</Button>
  </Column>
</Host>;
```

## Components (one row each — confirm exact props against the installed `.d.ts`)

| Component | Key props / usage | Notes & gotchas |
|-----------|-------------------|-----------------|
| `Host` | `matchContents?: boolean \| {vertical?, horizontal?}`, `style`, `children` | Required root. `matchContents` sizes to content; use `style={{ flex: 1 }}` (or explicit size) when wrapping a scrollable. Always from `@expo/ui`. |
| `Column` | `spacing?`, `alignment?: 'leading'\|'center'\|'trailing'`, `children` | Vertical layout. Use instead of `<View style={{flexDirection:'column'}}>`. |
| `Row` | `spacing?`, `alignment?: 'top'\|'center'\|'bottom'`, `children` | Horizontal layout. |
| `Spacer` | `minLength?` | Flexible gap between siblings; pushes content apart. |
| `ScrollView` | `horizontal?`, `children` | Scrollable container. Wrap its `Host` in `style={{ flex: 1 }}`. |
| `Text` | `children`, `color?`, `size?`, `weight?` | Display text. Renders native `Text`/`Label`; not the RN `Text`. |
| `Icon` | platform icon — SF Symbol (iOS) / Material Symbol (Android) | Cross-platform icon; see platform refs for the exact source format. |
| `Button` | `onPress`, `children` (or `label?`), `variant?` | **`onPress`** here (Compose-native uses `onClick`). |
| `Switch` | `value: boolean`, `onValueChange`, `label?` | Native toggle. (SwiftUI-native `Toggle` uses `isOn`/`onIsOnChange`; the universal wrapper normalizes to `value`/`onValueChange` — verify on your version.) |
| `Checkbox` | `value: boolean`, `onValueChange`, `label?` | Checked/unchecked control. |
| `Slider` | `value: number`, `onValueChange`, `min?`, `max?`, `steps?` | Continuous/stepped range selector. |
| `TextInput` | `value`, `onChangeText`, `placeholder?` | **Not RN's TextInput.** With `useNativeState`, `value` is an `ObservableState`, not a string — see below. |
| `Picker` | `options`/`selection` + change handler, `variant?` | Single-select. Prop shape differs across layers (SwiftUI uses `selection`/`onSelectionChange` + `tag`) — confirm on your version via `.d.ts`. |
| `BottomSheet` | `isOpened: boolean`, `onIsOpenedChange`, `children` | Modal sheet from the bottom. Control open state from React. |
| `Collapsible` | `label`, `children` | Tappable header that toggles its content. |
| `List` | `children` (rows) + `ListItem` | Virtualized rows. **Each `ListItem` is a JS-thread JSX node — fine for settings, slow for large data.** |
| `ListItem` | row content, tap handler | The tappable primitive inside `List`. |
| `FieldGroup` | `children` | Scrollable container of grouped settings-style rows. |
| `RNHostView` | `matchContents?`, `children` | Embeds RN components *inside* a native subtree (the inverse bridge). |

## `TextInput` + `useNativeState` (synchronous, flicker-free input)

`TextInput`'s `value` takes an `ObservableState` from `useNativeState`, not a plain string.
On keystroke, `onChangeText` runs as a **worklet on the UI thread** and writes `value`
directly, skipping a React render. Requires `react-native-worklets`; without it the
`'worklet'` directive is inert and flicker returns.

```tsx
import { Host, TextInput, useNativeState } from '@expo/ui';
import { useCallback } from 'react';

const text = useNativeState('');
const onChangeText = useCallback((v: string) => {
  'worklet';
  text.value = v.toUpperCase(); // transform synchronously, no re-render
}, [text]);

<Host matchContents>
  <TextInput value={text} onChangeText={onChangeText} placeholder="Type here" />
</Host>;
```

`ObservableState.value` is read/written from worklets; `onChange` fires a worklet listener.

## Confirming the API (source of truth)

`@expo/ui` is versioned with the SDK and its props change between cycles, so the **installed
`.d.ts` wins** over both this table and the docs:

- Installed types: `node_modules/@expo/ui/build/universal/<Component>/index.d.ts`
- Enumerate installed: `node <skill-root>/scripts/list-components.js <project-path>`
- Docs (track latest): overview `https://docs.expo.dev/versions/latest/sdk/ui/universal/index.md`,
  per component `.../universal/{component}/index.md`

## When to drop to a platform layer

Stay universal whenever it covers the need. Drop to `./swift-ui.md` or
`./jetpack-compose.md` only for a component, modifier, or behavior the universal API does
not surface — accepting the per-platform file split that requires.
