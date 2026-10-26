# Drop-in replacements for RN community libraries

> **Migration side-path, not the default build path.** Use these only to swap out an RN
> community UI dependency you already have. For new UI, start at `./universal.md`. SDK 56+
> for the full set (some exist on SDK 55).

Each replacement lives under `@expo/ui/community/<kebab-case-name>` and is API-compatible
with the library it replaces (backed by SwiftUI on iOS / Jetpack Compose on Android), so the
swap is usually just the import path. Watch the **default vs named** import — it matches the
original library.

| Replaces | Import |
|----------|--------|
| `@gorhom/bottom-sheet` | `import BottomSheet, { BottomSheetView } from '@expo/ui/community/bottom-sheet'` |
| `@react-native-community/datetimepicker` | `import DateTimePicker from '@expo/ui/community/datetime-picker'` |
| `@react-native-masked-view/masked-view` | `import { MaskedView } from '@expo/ui/community/masked-view'` |
| `@react-native-menu/menu` | `import { MenuView } from '@expo/ui/community/menu'` |
| `react-native-pager-view` | `import PagerView from '@expo/ui/community/pager-view'` |
| `@react-native-picker/picker` | `import { Picker } from '@expo/ui/community/picker'` |
| `@react-native-segmented-control/segmented-control` | `import SegmentedControl from '@expo/ui/community/segmented-control'` |
| `@react-native-community/slider` | `import Slider from '@expo/ui/community/slider'` |

## Migrating

1. Change the import path (above). Keep usage as-is to start.
2. Because the native backing is SwiftUI/Compose (not UIKit/Android Views), **some props are
   unsupported or behave differently**. Check the component's doc page and the installed
   `.d.ts` for deltas, then adjust.
3. Remove the old dependency once the screen is verified on both platforms.

## Confirming the API

- Installed types: `node_modules/@expo/ui/build/community/<name>/index.d.ts`
- Docs: overview `https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/index.md`;
  per component `.../drop-in-replacements/{component}/index.md` (slug is the name lowercased
  with no hyphens — `bottomsheet`, `datetimepicker`, `segmentedcontrol`, `pagerview`,
  `maskedview`, `menu`, `picker`, `slider`).

> For brand-new UI, prefer the universal components or a platform-specific tree over a
> drop-in. Drop-ins exist to reduce dependencies during migration, not to be the primary
> way you build.
