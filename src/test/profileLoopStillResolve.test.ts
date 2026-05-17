import { describe, it, expect } from "vitest";
import { resolveStillOrderForTests, rowStillCandidateUrls } from "@/lib/profileLoopStillResolve";

describe("profileLoopStillResolve", () => {
  it("skips video URLs on row columns", () => {
    const urls = rowStillCandidateUrls({
      static_image_url: "https://example.com/profile-loops/old.mp4",
      image_url: "https://example.com/still-2x3.jpg",
    });
    expect(urls).toEqual(["https://example.com/still-2x3.jpg"]);
  });

  it("prefers override portrait before row image_url", () => {
    const out = resolveStillOrderForTests({
      overridePortrait: "https://example.com/override-2x3.jpg",
      row: {
        static_image_url: null,
        image_url: "https://example.com/legacy-3x4.jpg",
      },
    });
    expect(out).toContain("override-2x3");
    expect(out).not.toContain("legacy-3x4");
  });
});
