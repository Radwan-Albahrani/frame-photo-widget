import { eq } from "drizzle-orm";
import * as StoreReview from "expo-store-review";
import { DiagnosticsService } from "@backend/api/diagnostics/diagnostics.service";
import { shouldAskForReview } from "@backend/api/review/reviewPolicy";
import { db } from "@backend/core/db/client";
import { now } from "@backend/core/db/ids";
import { settings } from "@backend/core/db/schema";

const KEY = "review";

export class ReviewService {
  static async askIfEarned(): Promise<boolean> {
    const lastAskedAt = await ReviewService.lastAskedAt();
    const health = await DiagnosticsService.health();
    if (!shouldAskForReview(health, lastAskedAt, now())) return false;
    if (!(await StoreReview.hasAction())) return false;
    await StoreReview.requestReview();
    await ReviewService.recordAsked();
    return true;
  }

  private static async lastAskedAt(): Promise<number | null> {
    const row = await db.select().from(settings).where(eq(settings.key, KEY)).get();
    if (row === undefined) return null;
    const { askedAt } = JSON.parse(row.value) as { askedAt?: number };
    return askedAt ?? null;
  }

  private static async recordAsked(): Promise<void> {
    const value = JSON.stringify({ askedAt: now() });
    await db
      .insert(settings)
      .values({ key: KEY, value, updatedAt: now() })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now() } })
      .run();
  }
}
