import { describe, it, expect } from "vitest";
import { formatSupabaseError } from "@/lib/supabaseError";

describe("formatSupabaseError", () => {
  it("formats PostgREST-style object", () => {
    const msg = formatSupabaseError({
      message: "new row violates row-level security policy",
      details: "Failing row contains (...).",
      hint: null,
      code: "42501",
    });
    expect(msg).toContain("row-level security");
    expect(msg).toContain("42501");
  });

  it("falls back to Error.message", () => {
    expect(formatSupabaseError(new Error("boom"))).toBe("boom");
  });
});
