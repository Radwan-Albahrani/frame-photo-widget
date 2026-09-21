import { View } from "react-native";
import { Text } from "@ui/components/primitives/Text";
import { space } from "@ui/theme";

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={{ paddingHorizontal: space.xs, paddingBottom: space.xs }}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
    </View>
  );
}
