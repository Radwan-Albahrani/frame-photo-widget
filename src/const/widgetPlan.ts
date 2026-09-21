// what: mirrors targets/widgets/FrameWidgets.swift; change both together or Diagnostics lies
export const WIDGET_FAMILIES = ["small", "medium", "large", "extraLarge"] as const;

export type WidgetFamilyName = (typeof WIDGET_FAMILIES)[number];

export interface FamilyPlan {
  family: WidgetFamilyName;
  label: string;
  decodePixels: number;
  entriesPerTimeline: number;
}

export const MINIMUM_INTERVAL_MINUTES = 5;

export const FAMILY_PLANS: FamilyPlan[] = [
  { family: "small", label: "Small", decodePixels: 640, entriesPerTimeline: 24 },
  { family: "medium", label: "Medium", decodePixels: 640, entriesPerTimeline: 24 },
  { family: "large", label: "Large", decodePixels: 640, entriesPerTimeline: 24 },
  { family: "extraLarge", label: "Extra large", decodePixels: 640, entriesPerTimeline: 16 },
];

export function coverageHours(plan: FamilyPlan, intervalMinutes: number): number {
  return (plan.entriesPerTimeline * Math.max(MINIMUM_INTERVAL_MINUTES, intervalMinutes)) / 60;
}

export function reloadsPerDay(plan: FamilyPlan, intervalMinutes: number): number {
  return 24 / coverageHours(plan, intervalMinutes);
}

export function nextChangeAt(intervalMinutes: number, from: number = Date.now()): number {
  const step = Math.max(MINIMUM_INTERVAL_MINUTES, intervalMinutes) * 60_000;
  return Math.floor(from / step) * step + step;
}
