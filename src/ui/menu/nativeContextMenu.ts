import { requireNativeView } from "expo";
import { processColor, type ViewProps } from "react-native";
import type { DragKind, DropItemsEvent, MenuAction } from "./types";

interface NativeMenuActionPayload {
  id?: string;
  title: string;
  image?: string;
  imageColor?: number;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  state?: string;
  displayInline?: boolean;
  subactions?: NativeMenuActionPayload[];
}

interface FrameContextMenuNativeProps extends ViewProps {
  actions: NativeMenuActionPayload[];
  menuTitle?: string;
  previewCornerRadius?: number;
  tapToOpen?: boolean;
  onPressAction?: (event: { nativeEvent: { event: string } }) => void;
  dragItemId?: string;
  dragItemKind?: DragKind;
  dropAccepts?: DragKind[];
  springLoads?: boolean;
  onDropItems?: (event: DropItemsEvent) => void;
  onSpringLoad?: () => void;
}

interface FrameDropZoneNativeProps extends ViewProps {
  ownedIds: string[];
  onDropItems: (event: DropItemsEvent) => void;
}

export const NativeContextMenuView =
  requireNativeView<FrameContextMenuNativeProps>("FrameContextMenu");

export const NativeDropZoneView = requireNativeView<FrameDropZoneNativeProps>(
  "FrameContextMenu",
  "FrameDropZoneView"
);

export function toNativeActions(actions: MenuAction[]): NativeMenuActionPayload[] {
  return actions.map((action) => ({
    id: action.id,
    title: action.title,
    image: action.image,
    imageColor: action.imageColor != null ? (processColor(action.imageColor) as number) : undefined,
    destructive: action.attributes?.destructive,
    disabled: action.attributes?.disabled,
    hidden: action.attributes?.hidden,
    state: action.state,
    displayInline: action.displayInline,
    subactions: action.subactions ? toNativeActions(action.subactions) : undefined,
  }));
}
