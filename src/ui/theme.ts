export const colors = {
  surface: "#070708",
  surfaceElevated: "#141416",
  surfaceTinted: "#1c1c1f",
  skeleton: "#2e2e35",
  divider: "#26262a",
  hairline: "rgba(255,255,255,0.06)",
  rimLight: "rgba(255,255,255,0.14)",
  veil: "rgba(255,255,255,0.07)",
  veilStrong: "rgba(255,255,255,0.12)",
  ink: "#fafafa",
  inkDim: "#a1a1aa",
  inkMuted: "#71717a",
  inkSubtle: "#52525b",
  accent: "#f5b301",
  accentDim: "#c98f00",
  accentSoft: "rgba(245,179,1,0.16)",
  accentInk: "#1a1400",
  error: "#ef4444",
  errorSoft: "rgba(239,68,68,0.14)",
  scrim: "rgba(0,0,0,0.55)",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 34,
  pill: 999,
} as const;

export const aspect = {
  square: 1,
  portrait: 3 / 4,
  landscape: 16 / 9,
} as const;

export const glass = {
  tint: "systemChromeMaterialDark" as const,
  intensity: 60,
} as const;
