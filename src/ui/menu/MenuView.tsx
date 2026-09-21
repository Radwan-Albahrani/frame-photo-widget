import { radius } from "@ui/theme";
import { NativeContextMenuView, toNativeActions } from "./nativeContextMenu";
import type { MenuComponentProps } from "./types";

export function MenuView({
  actions,
  onPressAction,
  title,
  children,
  style,
  testID,
  accessibilityLabel,
  disabled,
}: MenuComponentProps) {
  return (
    <NativeContextMenuView
      tapToOpen
      actions={toNativeActions(actions)}
      menuTitle={title}
      previewCornerRadius={radius.md}
      onPressAction={onPressAction}
      pointerEvents={disabled ? "box-only" : "auto"}
      style={style}
      testID={testID}
      accessible={accessibilityLabel != null || undefined}
      accessibilityRole="button"
      accessibilityState={disabled ? { disabled: true } : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </NativeContextMenuView>
  );
}
