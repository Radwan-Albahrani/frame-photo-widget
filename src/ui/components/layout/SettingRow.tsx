import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@ui/components/primitives/Text";
import { space } from "@ui/theme";

interface SettingRowProps {
  label: string;
  hint?: string;
  children: ReactNode;
  stacked?: boolean;
}

export function SettingRow({ label, hint, children, stacked = false }: SettingRowProps) {
  if (stacked) {
    return (
      <View style={{ gap: space.sm }}>
        <View style={{ gap: 2 }}>
          <Text variant="body">{label}</Text>
          {hint === undefined ? null : (
            <Text variant="footnote" tone="muted">
              {hint}
            </Text>
          )}
        </View>
        {children}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space.lg,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body">{label}</Text>
        {hint === undefined ? null : (
          <Text variant="footnote" tone="muted">
            {hint}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}
