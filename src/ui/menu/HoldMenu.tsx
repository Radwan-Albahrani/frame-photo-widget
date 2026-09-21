import type { PropsWithChildren } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { radius } from "@ui/theme";
import { NativeContextMenuView, toNativeActions } from "./nativeContextMenu";
import type { HoldMenuProps } from "./types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESSED_SCALE = 0.96;
const PRESS_IN_TIMING = { duration: 120, easing: Easing.out(Easing.quad) };
const RELEASE_SPRING = { damping: 16, stiffness: 280, mass: 0.7 };

const FILL_STYLE: ViewStyle = { flex: 1, alignSelf: "stretch" };

interface CardPressableProps extends PropsWithChildren {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function CardPressable({ onPress, disabled, style, children }: CardPressableProps) {
  const scale = useSharedValue(1);

  const animatedCard = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePressIn = () => {
    scale.set(withTiming(PRESSED_SCALE, PRESS_IN_TIMING));
  };

  const handlePressOut = () => {
    scale.set(withSpring(1, RELEASE_SPRING));
  };

  return (
    <AnimatedPressable
      style={[style, animatedCard]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessible={false}
    >
      {children}
    </AnimatedPressable>
  );
}

export function HoldMenu({
  actions,
  onPressAction,
  onPress,
  title,
  disabled,
  fill,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  testID,
  children,
}: HoldMenuProps) {
  return (
    <NativeContextMenuView
      actions={toNativeActions(actions)}
      menuTitle={title}
      previewCornerRadius={radius.xl}
      onPressAction={onPressAction}
      style={fill ? FILL_STYLE : undefined}
      accessible={accessibilityLabel != null || undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      testID={testID}
    >
      <CardPressable onPress={onPress} disabled={disabled} style={fill ? FILL_STYLE : undefined}>
        {children}
      </CardPressable>
    </NativeContextMenuView>
  );
}
