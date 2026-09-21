import * as Haptics from "expo-haptics";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "@ui/components/primitives/Text";
import { colors, radius, space } from "@ui/theme";

export type ButtonVariant = "primary" | "secondary" | "destructive";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: SymbolViewProps["name"];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const backgrounds: Record<ButtonVariant, string> = {
  primary: colors.accent,
  secondary: colors.surfaceTinted,
  destructive: colors.errorSoft,
};

const inkFor: Record<ButtonVariant, string> = {
  primary: colors.accentInk,
  secondary: colors.ink,
  destructive: colors.error,
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.sm,
          paddingVertical: space.md + 2,
          paddingHorizontal: space.xl,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          backgroundColor: backgrounds[variant],
          borderWidth: variant === "secondary" ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.hairline,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon === undefined ? null : (
        <View>
          <SymbolView name={icon} tintColor={inkFor[variant]} size={18} />
        </View>
      )}
      <Text variant="bodyMedium" style={{ color: inkFor[variant] }}>
        {label}
      </Text>
    </Pressable>
  );
}
