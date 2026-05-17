import { describe, it, expect } from "vitest";
import {
  extractMenuPrimarySceneBody,
  resolveMenuPrimarySceneForImagine,
} from "@/lib/chatMenuPrimarySceneExtract";
import { resolveChatImageGenerationPrompt } from "@/lib/chatImageSettings";
import { FAB_SELFIE } from "@/lib/chatImageSettings";

const BUBBLE_SCENE =
  "Luxurious bubble bath, strategically covered by foam and angles, steam, candle glow.";

describe("extractMenuPrimarySceneBody", () => {
  it("extracts from MENU_TILE_SCENE marker in fused brief", () => {
    const fused = `— Requested framing (from menu) —
MENU_TILE_SCENE:
${BUBBLE_SCENE}

**PRIMARY SCENE (execute literally — place / pose / wardrobe):**
${BUBBLE_SCENE}

**Tier tone only (not location):**
${FAB_SELFIE.lewd.imagePrompt}`;
    const out = extractMenuPrimarySceneBody(fused);
    expect(out).toContain("MENU_TILE_SCENE:");
    expect(out).toContain("bubble bath");
  });

  it("extracts from USER-CHOSEN SCENE marker in master brief", () => {
    const fused = `— LIKENESS #1 —
— USER-CHOSEN SCENE (EXECUTION PRIORITY #1 — NOT A PORTRAIT REMASTER) —
${BUBBLE_SCENE}
CHARACTER APPEARANCE: test`;
    const out = extractMenuPrimarySceneBody(fused);
    expect(out).toContain("USER-CHOSEN SCENE");
    expect(out).toContain("bubble bath");
  });
});

describe("resolveMenuPrimarySceneForImagine", () => {
  it("prefers explicit tile scene over fused prompt", () => {
    const out = resolveMenuPrimarySceneForImagine({
      explicitTileScene: BUBBLE_SCENE,
      fusedPrompt: "generic identity prose only",
    });
    expect(out).toBe(BUBBLE_SCENE);
  });
});

describe("resolveChatImageGenerationPrompt", () => {
  it("places tile scene in PRIMARY SCENE and labels tier as tone-only", () => {
    const out = resolveChatImageGenerationPrompt({
      messageText: 'Elena — "Sensual Bubble Bath" still for me?',
      menuImagePrompt: FAB_SELFIE.lewd.imagePrompt,
      styledSceneExtension: BUBBLE_SCENE,
      menuTileLabel: "Sensual Bubble Bath",
    });
    expect(out).toContain("MENU_TILE_SCENE:");
    expect(out).toContain(BUBBLE_SCENE);
    expect(out).toContain("**PRIMARY SCENE (execute literally");
    expect(out).toContain("**Tier tone only (not location):**");
    expect(out).toContain("Sensual Bubble Bath");
  });
});
