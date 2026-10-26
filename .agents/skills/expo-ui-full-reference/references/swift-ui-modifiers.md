# SwiftUI modifiers (`@expo/ui/swift-ui/modifiers`)

> iOS only. Applied via the `modifiers={[...]}` prop on any `@expo/ui/swift-ui` component.
> **Order matters** (e.g. `padding` before `background` differs from the reverse). Each
> returns a `ModifierConfig`. This is the full SDK 56 catalog; confirm exact signatures
> against `node_modules/@expo/ui/build/swift-ui/modifiers/index.d.ts`, since availability
> shifts by version and many map to iOS-version-gated SwiftUI APIs.

```tsx
import { Text, Host, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, padding, shadow, onTapGesture } from '@expo/ui/swift-ui/modifiers';

<Host style={{ flex: 1 }}>
  <VStack spacing={20}>
    <Text modifiers={[background('#FF6B6B'), cornerRadius(12), padding({ all: 16 })]}>Styled</Text>
    <Text modifiers={[shadow({ radius: 4, y: 2 }), onTapGesture(() => {})]}>Tap me</Text>
  </VStack>
</Host>;
```

## Layout & sizing
`frame({width,height,minWidth,maxWidth,minHeight,maxHeight,idealWidth,idealHeight,alignment})` ·
`padding({all|top|bottom|leading|trailing|horizontal|vertical})` ·
`offset({x,y})` · `fixedSize({horizontal,vertical})` · `layoutPriority(n)` ·
`aspectRatio({ratio,contentMode:'fit'|'fill'})` · `containerRelativeFrame({axes,count,span,spacing,alignment})` (iOS 17+) ·
`ignoreSafeArea({edges,regions})` · `hidden(bool?)`

## Padding/grid
`gridCellAnchor(...)` · `gridCellColumns(n)` · `gridCellUnsizedAxes('horizontal'|'vertical')` ·
`gridColumnAlignment('leading'|'center'|'trailing')` (iOS 16+)

## Appearance & color
`background(color, shape?)` · `backgroundOverlay({color,alignment})` · `containerBackground(color,placement)` ·
`foregroundStyle(style)` (color | `{type:'hierarchical',style}` | linear/radial/angular gradient) ·
`foregroundColor(color)` (deprecated → `foregroundStyle`) · `tint(color)` · `opacity(n)` ·
`cornerRadius(n)` · `border({color,width})` · `shadow({radius,x,y,color})` ·
`overlay({color,alignment})` · `glassEffect({variant,interactive,tint,shape,cornerRadius})` (iOS 26+) ·
`glassEffectId(id,namespaceId)` (iOS 26+)

## Shape & clipping
`clipped(bool?)` · `clipShape(shape,cornerRadius?)` · `containerShape(shape)` ·
`contentShape(shape)` (make Spacer/empty areas tappable) · `mask(shape,cornerRadius?)`
Shapes from the `shapes` builder: `roundedRectangle`, `capsule`, `rectangle`, `ellipse`, `circle`, `containerRelativeShape`.

## Filters & transforms
`blur(radius)` · `brightness(-1..1)` · `contrast(n)` · `saturation(n)` · `grayscale(0..1)` ·
`hueRotation(deg)` · `colorInvert(bool?)` · `luminanceToAlpha()` ·
`rotationEffect(deg)` · `rotation3DEffect({angle,axis:{x,y,z},perspective})` ·
`scaleEffect(n | {x,y})` · `zIndex(n)`

## Text
`bold()` · `italic()` · `font({textStyle,family,size,weight,design})` · `kerning(n)` ·
`lineSpacing(n)` · `lineHeight(n)` (iOS 26+) · `lineLimit(n? | {min,max} | (n,{reservesSpace}))` ·
`multilineTextAlignment('leading'|'center'|'trailing')` · `truncationMode('head'|'middle'|'tail')` ·
`allowsTightening(bool)` · `monospacedDigit()` · `textCase('lowercase'|'uppercase')` ·
`strikethrough({isActive,color,pattern})` · `underline({isActive,color,pattern})` · `textSelection(bool)`

## Controls & component styles
`buttonStyle('automatic'|'plain'|'bordered'|'borderedProminent'|'borderless'|'glass'|'glassProminent')` ·
`controlSize('mini'|'small'|'regular'|'large'|'extraLarge')` ·
`labelStyle('automatic'|'iconOnly'|'titleAndIcon'|'titleOnly')` · `labelsHidden()` ·
`pickerStyle('segmented'|'menu'|'wheel'|...)` · `datePickerStyle(style)` · `gaugeStyle(style)` ·
`progressViewStyle(style)` · `toggleStyle('automatic'|'switch'|'button')` ·
`textFieldStyle('automatic'|'plain'|'roundedBorder')` · `menuActionDismissBehavior(...)` · `disabled(bool?)`

## Text input
`keyboardType(type)` · `textContentType(type)` · `textInputAutocapitalization('never'|'words'|'sentences'|'characters')` ·
`autocorrectionDisabled(bool?)` · `submitLabel('done'|'search'|'go'|'next'|'send'|...)` · `onSubmit(handler)`

## List, section & rows
`listStyle('automatic'|'plain'|'inset'|'insetGrouped'|'grouped'|'sidebar')` ·
`listRowBackground(color)` · `listRowSeparator('automatic'|'visible'|'hidden', edges?)` ·
`listRowInsets({top,bottom,leading,trailing})` · `listSectionSpacing(n|'default'|'compact')` (iOS 17+) ·
`listSectionMargins({edges,length})` (iOS 26+) · `headerProminence('standard'|'increased')` ·
`refreshable(async handler)` · `deleteDisabled(bool?)` · `moveDisabled(bool?)` · `badge(value?)` ·
`badgeProminence('standard'|'increased'|'decreased')` · `tag(string|number)` ·
`environment('colorScheme'|'editMode'|'locale'|'timeZone', value)`

## Sheets & presentation
`presentationDetents(detents, {selection,onSelectionChange})` (iOS 16+) ·
`presentationDragIndicator('automatic'|'visible'|'hidden')` (iOS 16+) ·
`presentationBackgroundInteraction(type)` (iOS 16.4+) · `interactiveDismissDisabled(bool?)`

## Scrolling
`scrollDisabled(bool?)` (iOS 16+) · `scrollContentBackground('automatic'|'visible'|'hidden')` ·
`scrollDismissesKeyboard('automatic'|'never'|'interactively'|'immediately')` (iOS 16+) ·
`scrollIndicators('automatic'|'never'|'visible'|'hidden', axes?)` (iOS 16+) ·
`scrollPosition(state, {anchor,onChange})` (iOS 17+) · `scrollTargetBehavior('paging'|'viewAligned')` (iOS 17+) ·
`scrollTargetLayout()` (iOS 17+) · `defaultScrollAnchor(anchor)` (iOS 17+) · `id(string)`

## Gestures & lifecycle
`onTapGesture(handler)` · `onLongPressGesture(handler, minimumDuration?)` ·
`onAppear(handler)` · `onDisappear(handler)` · `onGeometryChange(({width,height}) => void)`

## Animation
`animation(Animation.<preset>(params), animatedValue)` ·
`contentTransition('identity'|'numericText'|'opacity'|'interpolate', {countsDown})` (iOS 16+) ·
`matchedGeometryEffect(id, namespaceId)` · `symbolEffect(effect, {isActive,value,options})` (iOS 17+)
`Animation` presets: `easeInOut`, `easeIn`, `easeOut`, `linear` (TimingAnimationParams), `spring`, `interpolatingSpring`.

## Accessibility
`accessibilityLabel(s)` · `accessibilityHint(s)` · `accessibilityValue(s)`

## TabView / index
`tabViewStyle(config)` · `indexViewStyle(config?)`

## Widgets (WidgetKit)
`widgetURL(url)` · `widgetAccentedRenderingMode('fullColor'|'accented'|'desaturated'|'accentedDesaturated')`

## Custom / advanced (for extending Expo UI)
`createModifier(type, params?)` · `createModifierWithEventListener(type, listener, params?)` ·
`createViewModifierEventListener(modifiers)` — used to register custom native modifiers from a
local Expo module. See `https://docs.expo.dev/guides/expo-ui-swift-ui/extending/index.md`.

Full signatures + per-modifier iOS version gates:
`https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers/index.md`.
