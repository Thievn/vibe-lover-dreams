import { describe, it, expect } from "vitest";
import { pickPortraitStillUrl } from "@/lib/profileLoopStillResolve";
import { mergeCompanionDisplayWithUserOverride } from "@/lib/mergeCompanionDisplayOverride";
import type { DbCompanion } from "@/hooks/useCompanions";

describe("pickPortraitStillUrl", () => {
  it("prefers override portrait before row image_url", () => {
    const out = pickPortraitStillUrl([
      { source: "image", url: "https://cdn.example.com/old-3-4.jpg" },
      { source: "override", url: "https://cdn.example.com/new-2-3.jpg" },
    ]);
    expect(out).toBe("https://cdn.example.com/new-2-3.jpg");
  });

  it("skips video URLs when picking still", () => {
    const out = pickPortraitStillUrl([
      { source: "static", url: "https://cdn.example.com/profile-loops/x.mp4" },
      { source: "image", url: "https://cdn.example.com/still.jpg" },
    ]);
    expect(out).toBe("https://cdn.example.com/still.jpg");
  });
});

describe("mergeCompanionDisplayWithUserOverride", () => {
  const baseDb = {
    id: "cc-abc",
    name: "Test",
    static_image_url: "https://cdn.example.com/card.jpg",
    image_url: "https://cdn.example.com/card.jpg",
    animated_image_url: null,
    profile_loop_video_enabled: false,
  } as unknown as DbCompanion;

  it("uses override loop when enabled with valid MP4", () => {
    const merged = mergeCompanionDisplayWithUserOverride(baseDb, {
      portrait_url: "https://cdn.example.com/card.jpg",
      animated_portrait_url: "https://cdn.example.com/profile-loops/loop.mp4",
      profile_loop_video_enabled: true,
    });
    expect(merged?.profile_loop_video_enabled).toBe(true);
    expect(merged?.animated_image_url).toContain("profile-loops");
  });
});
