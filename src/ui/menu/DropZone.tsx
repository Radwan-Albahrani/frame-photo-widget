import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { NativeDropZoneView } from "./nativeContextMenu";
import type { DragItem } from "./types";

interface DropZoneProps {
  ownedIds: string[];
  onDrop: (items: DragItem[]) => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function DropZone({ ownedIds, onDrop, style, children }: DropZoneProps) {
  return (
    <NativeDropZoneView
      ownedIds={ownedIds}
      onDropItems={(event) => onDrop(event.nativeEvent.items)}
      style={style}
    >
      {children}
    </NativeDropZoneView>
  );
}
