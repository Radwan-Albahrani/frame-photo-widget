import { Form, Host, LabeledContent, Section, Text as NativeText } from "@expo/ui/swift-ui";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  DiagnosticsService,
  type DiagnosticsReport,
} from "@backend/api/diagnostics/diagnostics.service";
import { formatBytes, photoCountLabel } from "@ui/format";

function clockAt(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function hours(value: number): string {
  if (value >= 48) return `${Math.round(value / 24)} days`;
  if (value >= 1.5) return `${Math.round(value)} hours`;
  return `${Math.round(value * 60)} minutes`;
}

function everyLabel(minutes: number): string {
  if (minutes >= 1440) return "once a day";
  if (minutes >= 60) return `every ${minutes / 60} hours`;
  return `every ${minutes} minutes`;
}

export default function DiagnosticsScreen() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => setReport(await DiagnosticsService.read()))();
    }, [])
  );

  return (
    <>
      <Stack.Screen.Title>Diagnostics</Stack.Screen.Title>
      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form>
          <Section
            title="Rotation"
            footer={
              <NativeText>
                Frame schedules every change in advance, so your widgets keep moving while the app
                is closed. iOS never redraws a widget more often than every five minutes.
              </NativeText>
            }
          >
            <LabeledContent label="Changes">
              <NativeText>
                {report === null ? "—" : everyLabel(report.effectiveIntervalMinutes)}
              </NativeText>
            </LabeledContent>
            <LabeledContent label="Order">
              <NativeText>
                {report === null ? "—" : report.shuffle ? "Shuffled" : "In album order"}
              </NativeText>
            </LabeledContent>
            <LabeledContent label="Next change">
              <NativeText>{report === null ? "—" : clockAt(report.nextChangeAt)}</NativeText>
            </LabeledContent>
          </Section>

          <Section
            title="Scheduled ahead"
            footer={
              <NativeText>
                Each widget size gets its own schedule. iOS allows a widget roughly 40 to 70
                refreshes a day; moving between photos that are already scheduled costs none of
                that, so only the figure below is spent.
              </NativeText>
            }
          >
            {(report?.families ?? []).map((family) => (
              <LabeledContent key={family.family} label={family.label}>
                <NativeText>
                  {hours(family.coverageHours)} · {family.reloadsPerDay.toFixed(1)}/day
                </NativeText>
              </LabeledContent>
            ))}
          </Section>

          <Section
            title="Photo quality"
            footer={
              <NativeText>
                A widget stores every scheduled photo, and iOS rejects a schedule that grows too
                large. These are the largest sizes Frame can decode while keeping every schedule
                inside that limit.
              </NativeText>
            }
          >
            {(report?.families ?? []).map((family) => (
              <LabeledContent key={family.family} label={family.label}>
                <NativeText>
                  {family.decodePixels} px · {family.entriesPerTimeline} photos ahead
                </NativeText>
              </LabeledContent>
            ))}
          </Section>

          <Section title="Library">
            <LabeledContent label="Albums">
              <NativeText>{report === null ? "—" : String(report.albumCount)}</NativeText>
            </LabeledContent>
            <LabeledContent label="Photos">
              <NativeText>{report === null ? "—" : photoCountLabel(report.photoCount)}</NativeText>
            </LabeledContent>
            <LabeledContent label="Largest album">
              <NativeText>
                {report?.largestAlbum == null
                  ? "—"
                  : `${report.largestAlbum.name} · ${photoCountLabel(report.largestAlbum.photos)}`}
              </NativeText>
            </LabeledContent>
            <LabeledContent label="Photo copies">
              <NativeText>{report === null ? "—" : formatBytes(report.storageBytes)}</NativeText>
            </LabeledContent>
          </Section>
        </Form>
      </Host>
    </>
  );
}
