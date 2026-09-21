import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DEFAULT_SETTINGS,
  SettingsService,
  type AppSettings,
  type WidgetSource,
} from "@backend/api/settings/settings.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { usedBytes } from "@native/photoStore";
import { radius, spacing } from "@ui/theme";
import { useTheme } from "@ui/useTheme";

const INTERVALS = [
  { label: "15 minutes", value: 15 },
  { label: "1 hour", value: 60 },
  { label: "6 hours", value: 360 },
  { label: "Daily", value: 1440 },
];

const SOURCES: { label: string; value: WidgetSource; detail: string }[] = [
  { label: "Snapshot", value: "snapshot", detail: "Widget reads a mirrored JSON snapshot." },
  { label: "SQLite", value: "sqlite", detail: "Widget opens the shared database directly." },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [bytes, setBytes] = useState(0);

  const reload = useCallback(async () => {
    setSettings(await SettingsService.read());
    setBytes(await usedBytes());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const update = useCallback((next: Partial<AppSettings>) => {
    void (async () => {
      setSettings(await SettingsService.write(next));
      await WidgetService.sync();
      Haptics.selectionAsync();
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.xl,
          paddingBottom: spacing.xl * 3,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>
          Settings
        </Text>

        <Section title="Widget">
          <Row label="Change photo every">
            <Segmented
              options={INTERVALS.map((item) => item.label)}
              index={INTERVALS.findIndex((item) => item.value === settings.refreshMinutes)}
              onChange={(index) => update({ refreshMinutes: INTERVALS[index].value })}
            />
          </Row>
          <Divider />
          <ToggleRow
            label="Shuffle photos"
            value={settings.shuffle}
            onChange={(shuffle) => update({ shuffle })}
          />
          <Divider />
          <Row label="Photo fills the widget">
            <Segmented
              options={["Fill", "Fit"]}
              index={settings.fit === "fill" ? 0 : 1}
              onChange={(index) => update({ fit: index === 0 ? "fill" : "fit" })}
            />
          </Row>
        </Section>

        <Section title="Overlay">
          <ToggleRow
            label="Show album name"
            value={settings.showAlbumTitle}
            onChange={(showAlbumTitle) => update({ showAlbumTitle })}
          />
          <Divider />
          <ToggleRow
            label="Show date"
            value={settings.showDate}
            onChange={(showDate) => update({ showDate })}
          />
        </Section>

        <Section title="How to add a widget">
          <Step index={1} text="Touch and hold anywhere on your Home Screen." />
          <Step index={2} text="Tap Edit, then Add Widget, and search for Frame." />
          <Step index={3} text="Pick a size, then touch and hold the widget and tap Edit Widget." />
          <Step
            index={4}
            text="Choose which album it shows. Each widget can show a different one."
          />
        </Section>

        <Section title="Widget data source">
          <Row label="Read photos from">
            <Segmented
              options={SOURCES.map((item) => item.label)}
              index={SOURCES.findIndex((item) => item.value === settings.widgetSource)}
              onChange={(index) => update({ widgetSource: SOURCES[index].value })}
            />
          </Row>
          <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 19 }}>
            {SOURCES.find((item) => item.value === settings.widgetSource)?.detail}
          </Text>
        </Section>

        <Section title="Storage">
          <Row label="Photo copies on this device">
            <Text style={{ color: theme.textMuted, fontSize: 16 }}>{formatBytes(bytes)}</Text>
          </Row>
        </Section>

        <View style={{ gap: spacing.sm, paddingHorizontal: spacing.xs }}>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
            Frame is free, forever.
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 20 }}>
            No ads, no subscriptions, no limits. Your photos never leave your device: Frame keeps a
            resized copy so your widgets keep working even if you delete the original.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          paddingHorizontal: spacing.xs,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: radius.large,
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: theme.text, fontSize: 16 }}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: theme.text, fontSize: 16 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent }} />
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

function Segmented({
  options,
  index,
  onChange,
}: {
  options: string[];
  index: number;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.surfaceAlt,
        borderRadius: radius.medium,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((option, optionIndex) => {
        const active = optionIndex === index;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(optionIndex)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm + 2,
              borderRadius: radius.small,
              alignItems: "center",
              backgroundColor: active ? theme.accent : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? "#FFFFFF" : theme.text,
                fontSize: 14,
                fontWeight: active ? "600" : "500",
              }}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Step({ index, text }: { index: number; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: theme.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>{index}</Text>
      </View>
      <Text style={{ color: theme.text, fontSize: 15, flex: 1, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
