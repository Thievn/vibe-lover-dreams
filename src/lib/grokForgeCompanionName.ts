import type { SupabaseClient } from "@supabase/supabase-js";
import type { ForgePersonalityProfile } from "@/lib/forgePersonalityProfile";
import { DEFAULT_FORGE_PERSONALITY } from "@/lib/forgePersonalityProfile";
import {
  fetchForgeNameExclusions,
  fetchForgeTakenDisplayNames,
  generateForgeName,
  generateUniqueForgeNameFromMergedExclusions,
  normalizeNameKey,
} from "@/lib/forgeNameEngine";
import { invokeGenerateForgeCompanionName } from "@/lib/invokeGenerateForgeCompanionName";
import { withAsyncTimeout } from "@/lib/withAsyncTimeout";

const FORGE_GROK_NAME_INVOKE_TIMEOUT_MS = 72_000;
const MAX_GROK_NAME_ATTEMPTS = 5;

export type PickGrokForgeCompanionNameOptions = {
  supabase: SupabaseClient;
  userId: string;
  gender: string;
  forgePersonality?: ForgePersonalityProfile;
  /** Normalized keys already reserved this session (and/or DB keys merged by caller). */
  reservedNormalizedKeys?: ReadonlySet<string>;
  bumpProgress?: (message: string) => void;
};

/**
 * Returns a vault-unique display name via Grok; falls back to the local forge engine if Grok fails.
 */
export async function pickGrokForgeCompanionName(opts: PickGrokForgeCompanionNameOptions): Promise<{
  name: string;
  source: "grok" | "local";
}> {
  const fp = opts.forgePersonality ?? DEFAULT_FORGE_PERSONALITY;
  const merged = new Set<string>();
  if (opts.reservedNormalizedKeys) {
    for (const k of opts.reservedNormalizedKeys) {
      const nk = normalizeNameKey(String(k));
      if (nk) merged.add(nk);
    }
  }

  let avoidDisplay = await fetchForgeTakenDisplayNames(opts.supabase, opts.userId, 400);
  const avoidKeys = new Set(merged);
  const exKeys = await fetchForgeNameExclusions(opts.supabase, opts.userId);
  for (const k of exKeys) avoidKeys.add(k);

  const avoidForGrok = (): string[] => {
    const base = [...avoidDisplay];
    for (const k of merged) {
      if (!k) continue;
      if (base.some((d) => normalizeNameKey(d) === k)) continue;
      base.push(k);
    }
    return base.slice(0, 400);
  };

  for (let attempt = 0; attempt < MAX_GROK_NAME_ATTEMPTS; attempt++) {
    if (attempt === 0) {
      opts.bumpProgress?.("Grok is naming your companion…");
    } else {
      opts.bumpProgress?.("Grok is finding another name…");
    }
    const list = avoidForGrok();
    const { data, error } = await withAsyncTimeout(
      invokeGenerateForgeCompanionName({
        gender: opts.gender,
        avoid_names: list.length ? list : undefined,
      }),
      FORGE_GROK_NAME_INVOKE_TIMEOUT_MS,
      "Grok forge companion name",
    );
    if (error || !data?.name || typeof data.name !== "string") {
      break;
    }
    const candidate = data.name.trim().slice(0, 120);
    const nk = normalizeNameKey(candidate);
    if (!nk || candidate.length < 2) {
      avoidDisplay = [...avoidDisplay, candidate].filter(Boolean).slice(0, 400);
      continue;
    }
    if (!avoidKeys.has(nk)) {
      return { name: candidate, source: "grok" };
    }
    avoidDisplay = [...avoidDisplay, candidate].filter(Boolean).slice(0, 400);
    avoidKeys.add(nk);
  }

  const local = generateUniqueForgeNameFromMergedExclusions({ gender: opts.gender, forgePersonality: fp }, avoidKeys);
  return { name: local, source: "local" };
}

/**
 * Same as {@link pickGrokForgeCompanionName} but when the caller has no `userId` (signed-out preview paths).
 */
export function pickLocalForgeCompanionName(args: {
  gender: string;
  forgePersonality?: ForgePersonalityProfile;
  reservedNormalizedKeys?: ReadonlySet<string>;
}): string {
  const fp = args.forgePersonality ?? DEFAULT_FORGE_PERSONALITY;
  const ex = new Set<string>();
  if (args.reservedNormalizedKeys) {
    for (const k of args.reservedNormalizedKeys) {
      const nk = normalizeNameKey(String(k));
      if (nk) ex.add(nk);
    }
  }
  return generateForgeName({ gender: args.gender, forgePersonality: fp, exclude: ex });
}
