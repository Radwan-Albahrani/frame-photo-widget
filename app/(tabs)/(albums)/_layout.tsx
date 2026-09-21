import { Stack } from "expo-router";
import { DARK_HEADER } from "@ui/headerOptions";

export default function AlbumsStackLayout() {
  return (
    <Stack screenOptions={DARK_HEADER}>
      <Stack.Screen name="index" options={{ title: "Albums" }} />
      <Stack.Screen
        name="name"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.34],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="album-actions"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.55, 0.95],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="group-actions"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.55, 0.95],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
