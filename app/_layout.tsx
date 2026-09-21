import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WidgetService } from "@backend/api/widget/widget.service";
import { migrate } from "@backend/core/db/client";
import { bestEffort } from "@backend/core/log/logger";
import { colors } from "@ui/theme";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    migrate();
    bestEffort(WidgetService.sync(), { op: "widget.syncOnLaunch", stage: "launch" }).finally(() =>
      setReady(true)
    );
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
      />
    </GestureHandlerRootView>
  );
}
