import Constants from "expo-constants";
import * as MailComposer from "expo-mail-composer";
import { Linking, Platform } from "react-native";
import { SUPPORT_EMAIL } from "@const/identifiers";
import { reportFailure } from "@backend/core/log/logger";

const SUBJECT = "Frame feedback";

function deviceDetails(): string {
  const version = Constants.expoConfig?.version ?? "unknown";
  const build = Constants.nativeBuildVersion ?? "n/a";
  return [
    "----- About this device -----",
    `Frame ${version} (${build})`,
    `iOS ${String(Platform.Version)}`,
  ].join("\n");
}

function openMailto(body: string) {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch((error) =>
    reportFailure({ op: "supportEmail.mailto", email: SUPPORT_EMAIL }, error)
  );
}

export async function composeSupportEmail(): Promise<void> {
  const body = `\n\n\n${deviceDetails()}`;
  try {
    if (!(await MailComposer.isAvailableAsync())) {
      openMailto(body);
      return;
    }
    await MailComposer.composeAsync({ recipients: [SUPPORT_EMAIL], subject: SUBJECT, body });
  } catch (error) {
    reportFailure({ op: "supportEmail.compose", fallback: "mailto" }, error);
    openMailto(body);
  }
}
