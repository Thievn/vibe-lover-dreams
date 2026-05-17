import { describe, it, expect } from "vitest";
import {
  buildMenuImagineClampBody,
  buildMenuIdentityHeadFromParts,
  extractMenuPrimarySceneBody,
  resolveMenuPrimarySceneForImagine,
} from "@/lib/chatMenuPrimarySceneExtract";
import { resolveChatImageGenerationPrompt } from "@/lib/chatImageSettings";
import { FAB_SELFIE } from "@/lib/chatImageSettings";

const BUBBLE_SCENE =
  "Luxurious bubble bath, strategically covered by foam and angles, steam, candle glow.";

const IDENTITY_SNIPPET =
  "FORGE_VISUAL_IDENTITY: silver hair, violet eyes, pale skin, pointed ears, dragon-scale tattoo on shoulder.";

describe("buildMenuImagineClampBody", () => {
  it("sandwiches identity before tile scene", () => {
    const out = buildMenuImagineClampBody({
      identityHead: IDENTITY_SNIPPET,
      tileScene: BUBBLE_SCENE,
      tierTone: "Sensual tier — editorial tease only.",
    });
    const identityIdx = out.indexOf("CHARACTER / LIKENESS");
    const tileIdx = out.indexOf("MENU_TILE_SCENE:");
    expect(identityIdx).toBeGreaterThanOrEqual(0);
    expect(tileIdx).toBeGreaterThan(identityIdx);
    expect(out).toContain("pointed ears");
    expect(out).toContain("bubble bath");
  });
});

describe("resolveMenuPrimarySceneForImagine", () => {
  it("returns identity + tile sandwich when explicit tile is set (not tile-only)", () => {
    const out = resolveMenuPrimarySceneForImagine({
      identityHead: IDENTITY_SNIPPET,
      explicitTileScene: BUBBLE_SCENE,
      fusedPrompt: "generic identity prose only",
    });
    expect(out).toContain("CHARACTER / LIKENESS");
    expect(out).toContain("bubble bath");
    expect(out).not.toBe(BUBBLE_SCENE);
  });
});

describe("extractMenuPrimarySceneBody", () => {
  it("extracts from MENU_TILE_SCENE marker in fused brief", () => {
    const fused = `— Requested framing (from menu) —
${IDENTITY_SNIPPET}
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
});

describe("buildMenuIdentityHeadFromParts", () => {
  it("merges capsule, reference, and portrait lock", () => {
    const out = buildMenuIdentityHeadFromParts({
      visualIdentityCapsule: IDENTITY_SNIPPET,
      characterReference: "Tattoo sleeve, amber eyes, athletic build.",
      portraitConsistencyLock: "Same face as roster portrait.",
    });
    expect(out).toContain("FORGE_VISUAL_IDENTITY");
    expect(out).toContain("Tattoo sleeve");
    expect(out).toContain("roster portrait");
  });
});

describe("resolveChatImageGenerationPrompt", () => {
  it("places likeness before MENU_TILE_SCENE and labels tier as tone-only", () => {
    const out = resolveChatImageGenerationPrompt({
      messageText: 'Elena — "Sensual Bubble Bath" still for me?',
      menuImagePrompt: FAB_SELFIE.lewd.imagePrompt,
      styledSceneExtension: BUBBLE_SCENE,
      menuTileLabel: "Sensual Bubble Bath",
      characterReference: "Pointed ears, violet eyes, pale skin.",
    });
    const likenessIdx = out.indexOf("#1 PRIORITY — SAME PERSON");
    const tileIdx = out.indexOf("MENU_TILE_SCENE:");
    expect(likenessIdx).toBeGreaterThanOrEqual(0);
    expect(tileIdx).toBeGreaterThan(likenessIdx);
    expect(out).toContain(BUBBLE_SCENE);
    expect(out).toContain("**Tier tone only (not location):**");
    expect(out).toContain("Sensual Bubble Bath");
  });
});
