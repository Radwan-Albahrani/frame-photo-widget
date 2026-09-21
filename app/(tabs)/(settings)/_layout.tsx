import { Stack } from "expo-router";
import { TRANSPARENT_HEADER } from "@ui/headerOptions";
import { colors } from "@ui/theme";

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...TRANSPARENT_HEADER,
        headerLargeTitle: true,
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}
