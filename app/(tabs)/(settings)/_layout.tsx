import { Stack } from "expo-router";
import { DARK_HEADER } from "@ui/headerOptions";

export default function SettingsStackLayout() {
  return (
    <Stack screenOptions={DARK_HEADER}>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  );
}
