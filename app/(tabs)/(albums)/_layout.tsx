import { Stack } from "expo-router";
import { DARK_HEADER } from "@ui/headerOptions";
import { routeTitle } from "@ui/routeTitle";

export default function AlbumsStackLayout() {
  return (
    <Stack screenOptions={DARK_HEADER}>
      <Stack.Screen name="index" options={{ title: "Albums" }} />
      <Stack.Screen
        name="group/[id]"
        options={({ route }) => ({ title: routeTitle(route.params) })}
      />
      <Stack.Screen
        name="album/[id]"
        options={({ route }) => ({ title: routeTitle(route.params) })}
      />
      <Stack.Screen
        name="name"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.34],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
