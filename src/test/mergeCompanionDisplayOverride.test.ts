import { describe, it, expect } from "vitest";
import { mergeCompanionDisplayWithUserOverride } from "@/lib/mergeCompanionDisplayOverride";
import type { DbCompanion } from "@/hooks/useCompanions";

const baseDb = {
  id: "cc-abc",
  name: "Test",
  user_id: "u1",
  is_public: true,
  approved: true,
  animated_image_url: null,
  profile_loop_video_enabled: false,
  static_image_url: "https://example.com/card.jpg",
  image_url: "https://example.com/card.jpg",
} as unknown as DbCompanion;

describe("mergeCompanionDisplayWithUserOverride", () => {
  it("prefers override loop when enabled with profile-loops URL", () => {
    const merged = mergeCompanionDisplayWithUserOverride(baseDb, {
      portrait_url: "https://example.com/my-still.jpg",
      animated_portrait_url: "https://example.com/storage/v1/object/public/companion-images/profile-loops/cc-abc/loop.mp4",
      profile_loop_video_enabled: true,
    });
    expect(merged?.profile_loop_video_enabled).toBe(true);
    expect(merged?.animated_image_url).toContain("profile-loops");
  });

  it("does not use canonical loop when override disables loop", () => {
    const dbWithLoop = {
      ...baseDb,
      animated_image_url: "https://example.com/profile-loops/canonical.mp4",
      profile_loop_video_enabled: true,
    } as DbCompanion;
    const merged = mergeCompanionDisplayWithUserOverride(dbWithLoop, {
      portrait_url: null,
      animated_portrait_url: null,
      profile_loop_video_enabled: false,
    });
    expect(merged?.profile_loop_video_enabled).toBe(false);
    expect(merged?.animated_image_url).toBeNull();
  });
});
