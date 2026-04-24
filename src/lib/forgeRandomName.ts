import { generateForgeName } from "./forgeNameEngine";
import { DEFAULT_FORGE_PERSONALITY } from "./forgePersonalityProfile";

/**
 * Last-resort display name if unique generation must return immediately (no DB).
 * Uses the forge name engine with neutral seeds — not the old gothic compound generator.
 */
export function fallbackForgeDisplayName(): string {
  return generateForgeName({
    gender: "Non-Binary",
    forgePersonality: DEFAULT_FORGE_PERSONALITY,
  });
}
