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
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  DEFAULT_SETTINGS,
  SettingsService,
  type AppSettings,
  type PhotoFit,
  type PretickMode,
  type WidgetSource,
} from "@backend/api/settings/settings.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { DuplicatesService } from "@backend/api/duplicates/duplicates.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { reportFailure } from "@backend/core/log/logger";
import { usedBytes } from "@native/photoStore";
import { countLabel, formatBytes } from "@ui/format";

const INTERVALS = [
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "Hourly", value: 60 },
  { label: "Every 6 hours", value: 360 },
  { label: "Daily", value: 1440 },
];

const PRETICK: { label: string; value: PretickMode }[] = [
  { label: "Off", value: "off" },
  { label: "This album", value: "album" },
  { label: "All of Frame", value: "frame" },
];

const PRETICK_FOOTER: Record<PretickMode, string> = {
  off: "The picker opens empty every time, so the same photo can be added twice, anywhere.",
  album:
    "Photos already in the album you are adding to show up ticked, so you can see what you are missing. A photo can still be added to a second album.",
  frame:
    "Every photo anywhere in Frame shows up ticked, so you can see what you have never added. A photo already in one album cannot be added to another this way.",
};

const SOURCE_FOOTER: Record<WidgetSource, string> = {
  snapshot: "The widget reads a small mirrored snapshot. Most robust.",
  sqlite: "The widget opens the shared database directly. One source of truth.",
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [bytes, setBytes] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [duplicates, setDuplicates] = useState(0);
  const [rebuild, setRebuild] = useState<string | null>(null);
  const router = useRouter();

  const reload = useCallback(async () => {
    setSettings(await SettingsService.read());
    setBytes(await usedBytes());
    setDuplicates(await DuplicatesService.count());
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

  const rebuildCopies = useCallback(async () => {
    setRebuild("Working…");
    try {
      const result = await PhotosService.rebuildAllCopies();
      await WidgetService.sync();
      setBytes(await usedBytes());
      const parts = [`Rebuilt ${countLabel(result.rebuilt, "photo", "photos")}`];
      if (result.unlinked > 0) {
        parts.push(
          `${countLabel(result.unlinked, "older photo has", "older photos have")} no library link and stayed as they were`
        );
      }
      if (result.unmatched > 0) {
        parts.push(
          `${countLabel(result.unmatched, "pick isn't", "picks aren't")} in Frame yet, add those from an album`
        );
      }
      if (result.failures.length > 0) {
        parts.push(`${result.failures.length} failed: ${result.failures[0]}`);
      }
      setRebuild(parts.join(" · "));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      reportFailure({ op: "settings.rebuildCopies" }, error);
      setRebuild(`Could not rebuild: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const update = useCallback((next: Partial<AppSettings>) => {
    void (async () => {
      setSettings(await SettingsService.write(next));
      await WidgetService.sync();
    })();
  }, []);

  return (
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

        <Section
          title="Adding photos"
          footer={<NativeText>{PRETICK_FOOTER[settings.pretick]}</NativeText>}
        >
          <Picker
            label="Show as ticked"
            selection={settings.pretick}
            onSelectionChange={(value: PretickMode) => update({ pretick: value })}
          >
            {PRETICK.map((option) => (
              <NativeText key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </NativeText>
            ))}
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

        <Section
          title="Library"
          footer={
            <NativeText>
              Frame spots a photo added twice by the item you picked from your library, and by the
              image itself.
            </NativeText>
          }
        >
          <NativeButton
            label={
              duplicates === 0
                ? "No duplicate photos"
                : duplicates === 1
                  ? "Review 1 duplicate"
                  : `Review ${duplicates} duplicates`
            }
            systemImage="square.on.square.dashed"
            onPress={() => router.push("/duplicates")}
          />
        </Section>

        <Section
          title="Photo quality"
          footer={
            <NativeText>
              {rebuild ??
                "Opens the photo picker empty: iOS only hands over photos you tick fresh, never ones shown pre-ticked. Select the photos you already added, tap Done, and Frame rewrites its copies of them at the current size, in place. Frame never gets access to your photo library."}
            </NativeText>
          }
        >
          <NativeButton
            label={rebuild === "Working…" ? "Working…" : "Rebuild photo copies"}
            systemImage="wand.and.sparkles"
            onPress={() => void rebuildCopies()}
          />
        </Section>

        <Section
          title="Diagnostics"
          footer={
            <NativeText>
              Exactly what your widgets are scheduled to do, and why they look the way they do.
            </NativeText>
          }
        >
          <NativeButton
            label="How rotation works"
            systemImage="chart.line.uptrend.xyaxis"
            onPress={() => router.push("/diagnostics")}
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
  );
}
