import { Stack } from "expo-router";
import { TRANSPARENT_HEADER } from "@ui/headerOptions";
import { colors } from "@ui/theme";

export default function AlbumsStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...TRANSPARENT_HEADER,
        headerLargeTitle: true,
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen
        name="name"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.32],
          headerShown: false,
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
