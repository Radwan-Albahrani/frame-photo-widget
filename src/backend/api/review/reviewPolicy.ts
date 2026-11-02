import type { Health } from "@backend/api/diagnostics/diagnostics.service";

export const ASK_AGAIN_AFTER_MS = 180 * 24 * 60 * 60 * 1000;

export function shouldAskForReview(
  health: Health,
  lastAskedAt: number | null,
  now: number
): boolean {
  if (health !== "healthy") return false;
  return lastAskedAt === null || now - lastAskedAt >= ASK_AGAIN_AFTER_MS;
}
