import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { migrate } from "@backend/core/db/client";
import { WidgetService } from "@backend/api/widget/widget.service";
import { useTheme } from "@ui/useTheme";

export default function RootLayout() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    migrate();
    WidgetService.sync();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="album/[id]" options={{ presentation: "card" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
