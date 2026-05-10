import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function trimRef(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/**
 * Resolves physical-only character reference for Imagine: client `characterData` overrides DB.
 */
export async function resolveCharacterReferenceForImagine(
  supabase: SupabaseClient,
  companionId: string,
  characterData: Record<string, unknown>,
): Promise<string | null> {
  const fromClient =
    trimRef(characterData.character_reference) ||
    trimRef(characterData.characterReference) ||
    trimRef(characterData.appearance_reference) ||
    trimRef(characterData.appearanceReference);
  if (fromClient.length >= 20) return fromClient;

  const cid = (companionId || "").trim() || trimRef(characterData.companionId) || trimRef(characterData.companion_id);
  if (!cid || cid === "forge-preview") return fromClient || null;

  try {
    if (cid.startsWith("cc-")) {
      const uuid = cid.slice(3);
      const { data } = await supabase
        .from("custom_characters")
        .select("character_reference, appearance_reference")
        .eq("id", uuid)
        .maybeSingle();
      if (!data) return fromClient || null;
      const r = data as Record<string, unknown>;
      const out =
        trimRef(r.character_reference) || trimRef(r.appearance_reference) || fromClient;
      return out.length >= 20 ? out : null;
    }
    const { data } = await supabase
      .from("companions")
      .select("character_reference, appearance_reference")
      .eq("id", cid)
      .maybeSingle();
    if (!data) return fromClient || null;
    const r = data as Record<string, unknown>;
    const out = trimRef(r.character_reference) || trimRef(r.appearance_reference) || fromClient;
    return out.length >= 20 ? out : null;
  } catch (e) {
    console.warn("resolveCharacterReferenceForImagine:", e);
    return fromClient || null;
  }
}
