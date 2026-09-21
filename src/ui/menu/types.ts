import type { ReactNode } from "react";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

export type NativeActionEvent = { nativeEvent: { event: string } };

type MenuState = "off" | "on" | "mixed";

interface MenuAttributes {
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

export interface MenuAction {
  id?: string;
  title: string;
  image?: string;
  imageColor?: ColorValue;
  attributes?: MenuAttributes;
  state?: MenuState;
  subactions?: MenuAction[];
  displayInline?: boolean;
}

export interface MenuComponentProps {
  actions: MenuAction[];
  onPressAction?: (event: NativeActionEvent) => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export interface HoldMenuProps {
  actions: MenuAction[];
  onPressAction: (event: NativeActionEvent) => void;
  onPress: () => void;
  title?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  fill?: boolean;
  disabled?: boolean;
  accessibilityActions?: { name: string; label?: string }[];
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
  children: ReactNode;
}
