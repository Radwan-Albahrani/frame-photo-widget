import { describe, expect, it } from "vitest";
import { ASK_AGAIN_AFTER_MS, shouldAskForReview } from "@backend/api/review/reviewPolicy";

const NOW = 1_790_000_000_000;

describe("shouldAskForReview", () => {
  it("asks once a placed widget is showing photos", () => {
    expect(shouldAskForReview("healthy", null, NOW)).toBe(true);
  });

  it.each(["none", "waiting", "needsAlbum", "unreadable"] as const)(
    "never asks while the widget is %s",
    (health) => {
      expect(shouldAskForReview(health, null, NOW)).toBe(false);
    }
  );

  it("does not ask again before the cool-down ends", () => {
    expect(shouldAskForReview("healthy", NOW - ASK_AGAIN_AFTER_MS + 1, NOW)).toBe(false);
  });

  it("asks again after the cool-down", () => {
    expect(shouldAskForReview("healthy", NOW - ASK_AGAIN_AFTER_MS, NOW)).toBe(true);
  });
});
