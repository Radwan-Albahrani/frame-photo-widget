import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from "react-native";
import { colors } from "@ui/theme";

export type TextVariant =
  | "largeTitle"
  | "title"
  | "title2"
  | "heading"
  | "body"
  | "bodyMedium"
  | "subhead"
  | "footnote"
  | "caption"
  | "overline";

export type TextTone = "ink" | "dim" | "muted" | "subtle" | "accent" | "error" | "onAccent";

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  center?: boolean;
}

const variants = StyleSheet.create({
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.36 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: 0.2 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  heading: { fontSize: 20, lineHeight: 25, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  bodyMedium: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});

const tones: Record<TextTone, string> = {
  ink: colors.ink,
  dim: colors.inkDim,
  muted: colors.inkMuted,
  subtle: colors.inkSubtle,
  accent: colors.accent,
  error: colors.error,
  onAccent: colors.accentInk,
};

const HEADING_VARIANTS: ReadonlySet<TextVariant> = new Set([
  "largeTitle",
  "title",
  "title2",
  "heading",
]);

export function Text({
  variant = "body",
  tone = "ink",
  center,
  style,
  accessibilityRole,
  ...rest
}: TextProps) {
  return (
    <RNText
      accessibilityRole={
        accessibilityRole ?? (HEADING_VARIANTS.has(variant) ? "header" : undefined)
      }
      style={[
        variants[variant],
        { color: tones[tone] },
        center === true ? { textAlign: "center" } : null,
        style,
      ]}
      {...rest}
    />
  );
}
