import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";
import { Text } from "@ui/components/primitives/Text";
import { colors, space } from "@ui/theme";

interface SectionHeaderProps {
  title: string;
  onPress?: () => void;
}

export function SectionHeader({ title, onPress }: SectionHeaderProps) {
  const label = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {onPress === undefined ? null : (
        <SymbolView name="chevron.right" tintColor={colors.inkSubtle} size={11} />
      )}
    </View>
  );

  if (onPress === undefined) {
    return <View style={{ paddingHorizontal: space.xs, paddingBottom: space.xs }}>{label}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit group ${title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: space.xs,
        paddingBottom: space.xs,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {label}
    </Pressable>
  );
}
