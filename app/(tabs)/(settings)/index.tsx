import {
  Button as NativeButton,
  Form,
  Host,
  LabeledContent,
  Picker,
  Section,
  Text as NativeText,
  Toggle,
} from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  DEFAULT_SETTINGS,
  SettingsService,
  type AppSettings,
  type PhotoFit,
  type WidgetSource,
} from "@backend/api/settings/settings.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { usedBytes } from "@native/photoStore";

const INTERVALS = [
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "Hourly", value: 60 },
  { label: "Every 6 hours", value: 360 },
  { label: "Daily", value: 1440 },
];

const SOURCE_FOOTER: Record<WidgetSource, string> = {
  snapshot: "The widget reads a small mirrored snapshot. Most robust.",
  sqlite: "The widget opens the shared database directly. One source of truth.",
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [bytes, setBytes] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setSettings(await SettingsService.read());
    setBytes(await usedBytes());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const refreshWidgets = useCallback(async () => {
    setRefreshing(true);
    await WidgetService.sync();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRefreshing(false);
  }, []);

  const update = useCallback((next: Partial<AppSettings>) => {
    void (async () => {
      setSettings(await SettingsService.write(next));
      await WidgetService.sync();
    })();
  }, []);

  return (
    <>
      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form>
          <Section title="Widget">
            <Picker
              label="Change photo every"
              selection={settings.refreshMinutes}
              onSelectionChange={(value: number) => update({ refreshMinutes: value })}
            >
              {INTERVALS.map((interval) => (
                <NativeText key={interval.value} modifiers={[tag(interval.value)]}>
                  {interval.label}
                </NativeText>
              ))}
            </Picker>
            <Toggle
              label="Shuffle photos"
              isOn={settings.shuffle}
              onIsOnChange={(shuffle) => update({ shuffle })}
            />
            <Picker
              label="Photo size"
              selection={settings.fit}
              onSelectionChange={(value: PhotoFit) => update({ fit: value })}
              modifiers={[pickerStyle("segmented")]}
            >
              <NativeText modifiers={[tag("fill")]}>Fill</NativeText>
              <NativeText modifiers={[tag("fit")]}>Fit</NativeText>
            </Picker>
          </Section>

          <Section title="Overlay">
            <Toggle
              label="Show album name"
              isOn={settings.showAlbumTitle}
              onIsOnChange={(showAlbumTitle) => update({ showAlbumTitle })}
            />
            <Toggle
              label="Show date"
              isOn={settings.showDate}
              onIsOnChange={(showDate) => update({ showDate })}
            />
          </Section>

          <Section title="How to add a widget">
            <NativeText>1. Touch and hold your Home Screen.</NativeText>
            <NativeText>2. Tap Edit, then Add Widget, and find Frame.</NativeText>
            <NativeText>3. Pick a size and place it.</NativeText>
            <NativeText>4. Hold the widget, tap Edit Widget, and choose an album.</NativeText>
          </Section>

          <Section
            title="Refresh"
            footer={
              <NativeText>
                Widgets change photos on their own, even when Frame is closed. Use this after adding
                photos if you want the change right now.
              </NativeText>
            }
          >
            <NativeButton
              label={refreshing ? "Updating…" : "Update widgets now"}
              systemImage="arrow.clockwise"
              onPress={() => void refreshWidgets()}
            />
          </Section>

          <Section title="Storage">
            <LabeledContent label="Photo copies">
              <NativeText>{formatBytes(bytes)}</NativeText>
            </LabeledContent>
          </Section>

          <Section
            title="Widget data source"
            footer={<NativeText>{SOURCE_FOOTER[settings.widgetSource]}</NativeText>}
          >
            <Picker
              label="Read photos from"
              selection={settings.widgetSource}
              onSelectionChange={(value: WidgetSource) => update({ widgetSource: value })}
              modifiers={[pickerStyle("segmented")]}
            >
              <NativeText modifiers={[tag("snapshot")]}>Snapshot</NativeText>
              <NativeText modifiers={[tag("sqlite")]}>SQLite</NativeText>
            </Picker>
          </Section>

          <Section
            footer={
              <NativeText>
                No ads, no subscriptions, no limits. Your photos never leave this device.
              </NativeText>
            }
          >
            <LabeledContent label="Frame">
              <NativeText>Free, forever</NativeText>
            </LabeledContent>
          </Section>
        </Form>
      </Host>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
