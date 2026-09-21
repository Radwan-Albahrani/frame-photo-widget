import { requireNativeView } from "expo";
import { processColor, type ViewProps } from "react-native";
import type { MenuAction } from "./types";

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
}

export const NativeContextMenuView =
  requireNativeView<FrameContextMenuNativeProps>("FrameContextMenu");

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
