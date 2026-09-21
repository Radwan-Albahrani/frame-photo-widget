import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { View } from "react-native";
import { Button } from "@ui/components/primitives/Button";
import { Text } from "@ui/components/primitives/Text";
import { colors, space } from "@ui/theme";

interface EmptyStateProps {
  icon: SymbolViewProps["name"];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", gap: space.md, paddingHorizontal: space.xl }}>
      <SymbolView name={icon} tintColor={colors.inkMuted} size={46} />
      <Text variant="title2" center>
        {title}
      </Text>
      <Text variant="subhead" tone="dim" center>
        {message}
      </Text>
      {actionLabel === undefined || onAction === undefined ? null : (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: space.sm }} />
      )}
    </View>
  );
}
