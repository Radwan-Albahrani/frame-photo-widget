# Jetpack Compose modifiers (`@expo/ui/jetpack-compose/modifiers`)

> Android only. Applied via the `modifiers={[...]}` prop on any `@expo/ui/jetpack-compose`
> component. **Order matters** — modifiers apply in array order, so `padding` before
> `background` differs from the reverse (padding outside vs inside the fill). All values are
> in **dp**. Confirm exact signatures against
> `node_modules/@expo/ui/build/jetpack-compose/modifiers/index.d.ts`.

```tsx
import { Button, Host } from '@expo/ui/jetpack-compose';
import { paddingAll, fillMaxWidth, background, border, shadow } from '@expo/ui/jetpack-compose/modifiers';

<Host style={{ flex: 1 }}>
  <Button modifiers={[paddingAll(16), fillMaxWidth(), background('#FF6B6B')]}>Full-width</Button>
  <Button modifiers={[paddingAll(12), background('#4ECDC4'), border(2, '#2C3E50'), shadow(4)]}>Bordered</Button>
</Host>;
```

## Padding & position
| Modifier | Signature | Purpose |
|----------|-----------|---------|
| `paddingAll` | `paddingAll(all)` | Equal padding on all four sides. |
| `padding` | `padding(start, top, end, bottom)` | Per-edge padding. |
| `offset` | `offset(x, y)` | Shift from natural position without affecting siblings' layout. |

## Sizing
| Modifier | Signature | Purpose |
|----------|-----------|---------|
| `size` | `size(width, height)` | Exact width and height. |
| `width` / `height` | `width(n)` / `height(n)` | Exact single dimension. |
| `fillMaxSize` | `fillMaxSize(fraction?)` | Fill both axes (fraction 0–1, default 1). |
| `fillMaxWidth` | `fillMaxWidth(fraction?)` | Fill available width. |
| `fillMaxHeight` | `fillMaxHeight(fraction?)` | Fill available height. |
| `wrapContentWidth` | `wrapContentWidth(alignment?)` | Shrink to content width. |
| `wrapContentHeight` | `wrapContentHeight(alignment?)` | Shrink to content height. |
| `weight` | `weight(value)` | Proportional space inside a `Row`/`Column` (also flexible `Spacer`). |

## Appearance
| Modifier | Signature | Purpose |
|----------|-----------|---------|
| `background` | `background(color)` | Background fill. |
| `border` | `border(width, color)` | Border around the component. |
| `shadow` | `shadow(elevation)` | Elevation shadow beneath the component. |
| `alpha` | `alpha(value)` | Opacity (0–1). |
| `blur` | `blur(radius)` | Blur effect. |

## Transform
| Modifier | Signature | Purpose |
|----------|-----------|---------|
| `rotate` | `rotate(degrees)` | Rotate the component. |
| `zIndex` | `zIndex(index)` | Drawing order of overlapping components. |

## Interaction
| Modifier | Signature | Purpose |
|----------|-----------|---------|
| `clickable` | `clickable(handler)` | Makes the component tappable. |
| `onVisibilityChanged` | `onVisibilityChanged(handler, ...)` | Fires when the component enters/leaves the viewport. |

## Custom / advanced (for extending Expo UI)
`createModifier(type, params?)` registers a custom native modifier defined in a local Expo
module; `createViewModifierEventListener(modifiers)` wires event-based modifiers (like
`clickable`) into a custom view. The `register` lambda on the native side receives the JS
map plus the `ComposableScope` (needed for scope-dependent modifiers like `weight`/`align`).
Guide: `https://docs.expo.dev/guides/expo-ui-jetpack-compose/extending/index.md`.

> Material 3 dynamic colors come from `useMaterialColors()` (seed via the Host `seedColor` /
> `colorScheme` props), not a modifier. See `../references/jetpack-compose.md` and
> `https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/colors/index.md`.

Full signatures: `https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/modifiers/index.md`.
