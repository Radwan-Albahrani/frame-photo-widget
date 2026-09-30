import { Form, Host, LabeledContent, Section, Text as NativeText } from "@expo/ui/swift-ui";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  DiagnosticsService,
  type DiagnosticsReport,
  type Health,
  type WidgetReport,
} from "@backend/api/diagnostics/diagnostics.service";
import {
  ARCHIVE_LIMIT_BYTES,
  coversUntil,
  familyLabel,
  nextChangeAfter,
} from "@backend/api/diagnostics/widgetStatus";
import {
  agoFrom,
  countLabel,
  dayAndClockAt,
  everyLabel,
  formatBytes,
  photoCountLabel,
} from "@ui/format";

const STATUS: Record<Health, { title: string; detail: string }> = {
  healthy: {
    title: "Rotating on schedule",
    detail:
      "Every photo change listed below is already scheduled on your phone. Frame does not need to be open, and your phone does not need a connection, for any of them to happen.",
  },
  waiting: {
    title: "Waiting for first refresh",
    detail:
      "You have a widget on your Home Screen but iOS has not asked Frame for its photos yet. This usually takes a minute, and nothing is wrong.",
  },
  none: {
    title: "None placed yet",
    detail: "Touch and hold your Home Screen, tap Edit, then Add Widget, and pick Frame.",
  },
  needsAlbum: {
    title: "Needs an album",
    detail:
      "Your widgets have no photos to show. Touch and hold a widget, tap Edit Widget, and choose an album that has photos in it.",
  },
  unreadable: {
    title: "Could not be read",
    detail:
      "Frame could not read what its widgets last reported. Tapping Update widgets now in Settings rebuilds it.",
  },
};

const WIDGET_STATE: Record<string, string> = {
  noAlbum: "No album chosen",
  noPhotos: "Album has no photos",
  readError: "Library could not be read, retrying",
};

function WidgetSection({ widget, now }: { widget: WidgetReport; now: number }) {
  const broken = WIDGET_STATE[widget.state];
  return (
    <Section
      title={`${widget.albumName} · ${familyLabel(widget.family)}`}
      footer={
        <NativeText>
          {`Last reported ${agoFrom(widget.updatedAt, now)}, by iOS, with Frame closed. When this batch runs out iOS asks for the next one by itself — you do not need to open Frame then or ever.`}
        </NativeText>
      }
    >
      <LabeledContent label="Album">
        <NativeText>
          {broken ?? `${widget.albumName} · ${photoCountLabel(widget.photos)}`}
        </NativeText>
      </LabeledContent>
      {widget.groupName === "" ? null : (
        <LabeledContent label="Picked from">
          <NativeText>{widget.groupName}</NativeText>
        </LabeledContent>
      )}
      <LabeledContent label="Order">
        <NativeText>{widget.shuffle ? "Shuffled" : "In album order"}</NativeText>
      </LabeledContent>
      <LabeledContent label="Changes">
        <NativeText>{everyLabel(widget.intervalMinutes)}</NativeText>
      </LabeledContent>
      <LabeledContent label="Next photo">
        <NativeText>{dayAndClockAt(nextChangeAfter(widget, now), now)}</NativeText>
      </LabeledContent>
      <LabeledContent label="Photos ready until">
        <NativeText>{dayAndClockAt(coversUntil(widget), now)}</NativeText>
      </LabeledContent>
      <LabeledContent label="Photos queued">
        <NativeText>{photoCountLabel(widget.entries)}</NativeText>
      </LabeledContent>
      <LabeledContent label="Photo size">
        <NativeText>{`${widget.frameWidth} × ${widget.frameHeight} px, native`}</NativeText>
      </LabeledContent>
      <LabeledContent label="Schedule size">
        <NativeText>{`${formatBytes(widget.archiveBytes)} of ${formatBytes(ARCHIVE_LIMIT_BYTES)}`}</NativeText>
      </LabeledContent>
    </Section>
  );
}

export default function DiagnosticsScreen() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const now = Date.now();

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          setReport(await DiagnosticsService.read());
          setFailure(null);
        } catch (error) {
          setFailure(error instanceof Error ? error.message : String(error));
        }
      })();
    }, [])
  );

  const status = failure !== null ? STATUS.unreadable : report && STATUS[report.health];

  return (
    <>
      <Stack.Screen.Title>Diagnostics</Stack.Screen.Title>
      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form>
          <Section
            title="Status"
            footer={<NativeText>{failure ?? status?.detail ?? ""}</NativeText>}
          >
            <LabeledContent label="Widgets">
              <NativeText>{status?.title ?? "—"}</NativeText>
            </LabeledContent>
            <LabeledContent label="On your Home Screen">
              <NativeText>
                {report === null ? "—" : countLabel(report.placedCount, "widget", "widgets")}
              </NativeText>
            </LabeledContent>
            <LabeledContent label="Reporting">
              <NativeText>
                {report === null ? "—" : countLabel(report.widgets.length, "widget", "widgets")}
              </NativeText>
            </LabeledContent>
          </Section>

          {(report?.widgets ?? []).map((widget) => (
            <WidgetSection
              key={`${widget.family}|${widget.albumId}|${widget.groupName}|${widget.shuffle}`}
              widget={widget}
              now={now}
            />
          ))}

          <Section
            title="Applies to every widget"
            footer={
              <NativeText>
                Album order and shuffle are chosen per widget, in each widget's own edit sheet.
                These three are shared by all of them.
              </NativeText>
            }
          >
            <LabeledContent label="Framing">
              <NativeText>
                {report === null
                  ? "—"
                  : report.display.fit === "fit"
                    ? "Whole photo"
                    : "Fills the widget"}
              </NativeText>
            </LabeledContent>
            <LabeledContent label="Album title">
              <NativeText>
                {report === null ? "—" : report.display.showAlbumTitle ? "Shown" : "Hidden"}
              </NativeText>
            </LabeledContent>
            <LabeledContent label="Date">
              <NativeText>
                {report === null ? "—" : report.display.showDate ? "Shown" : "Hidden"}
              </NativeText>
            </LabeledContent>
          </Section>

          <Section
            title="How rotation works"
            footer={
              <NativeText>
                Frame hands iOS a batch of photo changes with the times they should happen, and iOS
                performs them itself. That is why rotation continues while Frame is closed, and why
                you never need to open the app to keep it going. iOS will not redraw a widget more
                often than every five minutes, and it allows roughly 40 to 70 batches a day — moving
                between photos inside a batch costs none of that.
              </NativeText>
            }
          >
            <LabeledContent label="Needs the app open">
              <NativeText>Never</NativeText>
            </LabeledContent>
            <LabeledContent label="Needs a connection">
              <NativeText>Never</NativeText>
            </LabeledContent>
            <LabeledContent label="Photos leave your phone">
              <NativeText>Never</NativeText>
            </LabeledContent>
          </Section>

          <Section
            title="Library"
            footer={
              <NativeText>
                Frame keeps its own downsampled copy of each photo so widgets can draw without
                opening your photo library.
              </NativeText>
            }
          >
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
