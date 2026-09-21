import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@ui/useTheme";

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Albums",
          tabBarIcon: ({ color }) => (
            <SymbolView name="rectangle.stack.fill" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <SymbolView name="gearshape.fill" tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
