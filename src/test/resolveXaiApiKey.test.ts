import { describe, it, expect } from "vitest";
import { resolveXaiApiKey } from "../../supabase/functions/_shared/resolveXaiApiKey";

describe("resolveXaiApiKey (Edge Function secret names)", () => {
  it("uses GROK_API_KEY when XAI_API_KEY is unset", () => {
    const key = resolveXaiApiKey((name) =>
      name === "GROK_API_KEY" ? "  sk-grok-only  " : undefined,
    );
    expect(key).toBe("sk-grok-only");
  });

  it("uses XAI_API_KEY when set", () => {
    const key = resolveXaiApiKey((name) => {
      if (name === "XAI_API_KEY") return "sk-xai";
      if (name === "GROK_API_KEY") return "sk-grok";
      return undefined;
    });
    expect(key).toBe("sk-xai");
  });

  it("falls back to GROK_API_KEY when XAI is empty after trim", () => {
    const key = resolveXaiApiKey((name) => {
      if (name === "XAI_API_KEY") return "   ";
      if (name === "GROK_API_KEY") return "sk-grok";
      return undefined;
    });
    expect(key).toBe("sk-grok");
  });

  it("returns null when neither is set", () => {
    expect(resolveXaiApiKey(() => undefined)).toBeNull();
  });
});
