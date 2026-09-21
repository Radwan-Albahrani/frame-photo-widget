import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, glass, radius as radii } from "@ui/theme";

export type SurfaceVariant = "elevated" | "tinted" | "veil" | "glass" | "plain";

interface SurfaceProps {
  children: ReactNode;
  variant?: SurfaceVariant;
  radius?: keyof typeof radii;
  padding?: number;
  bordered?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  noHaptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

const backgroundFor: Record<SurfaceVariant, string> = {
  elevated: colors.surfaceElevated,
  tinted: colors.surfaceTinted,
  veil: colors.veil,
  glass: "transparent",
  plain: "transparent",
};

export function Surface({
  children,
  variant = "elevated",
  radius = "lg",
  padding,
  bordered = true,
  onPress,
  accessibilityLabel,
  noHaptic = false,
  style,
}: SurfaceProps) {
  const base: ViewStyle = {
    borderRadius: radii[radius],
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: backgroundFor[variant],
    padding,
    borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
    borderColor: bordered ? colors.hairline : "transparent",
  };

  const body =
    variant === "glass" ? (
      <BlurView tint={glass.tint} intensity={glass.intensity} style={[base, style]}>
        {children}
      </BlurView>
    ) : (
      <View style={[base, style]}>{children}</View>
    );

  if (onPress === undefined) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        if (!noHaptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {body}
    </Pressable>
  );
}
