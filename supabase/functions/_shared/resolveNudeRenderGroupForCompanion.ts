import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { classifyPortraitRenderGroupWithXai } from "./classifyProfileArtStyleXai.ts";
import {
  inferNudeRenderGroupFromTextBlob,
  nudeStyleBlobFromRow,
  type NudeRenderGroup,
} from "./nudeTensorRenderGroup.server.ts";

const TABLE: (c: string) => "custom_characters" | "companions" = (id) =>
  id.startsWith("cc-") ? "custom_characters" : "companions";
const rowPk = (id: string) => (id.startsWith("cc-") ? id.slice(3) : id);

/**
 * @param portraitUrl Public HTTPS URL suitable for TAMS + Grok vision (same as chat portrait).
 */
export async function loadCompanionRow(
  supabase: SupabaseClient,
  companionId: string,
): Promise<Record<string, unknown> | null> {
  const t = TABLE(companionId);
  const { data, error } = await supabase.from(t).select("*").eq("id", rowPk(companionId)).maybeSingle();
  if (error) {
    console.error("loadCompanionRow:", error);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

function portraitUrlForVision(row: Record<string, unknown>): string | null {
  const a =
    (typeof row.static_image_url === "string" && row.static_image_url) ||
    (typeof row.image_url === "string" && row.image_url) ||
    (typeof row.avatar_url === "string" && row.avatar_url) ||
    "";
  const t = a.trim();
  if (!t || t.startsWith("data:") || t.startsWith("blob:")) return null;
  return t.split("#")[0]?.split("?")?.[0] ?? t;
}

async function persistRenderGroup(
  supabase: SupabaseClient,
  companionId: string,
  g: NudeRenderGroup,
): Promise<void> {
  const t = TABLE(companionId);
  const id = rowPk(companionId);
  const { error } = await supabase.from(t).update({ nude_tensor_render_group: g }).eq("id", id);
  if (error) console.error("persistRenderGroup:", error);
}

/**
 * Resolves and (when newly inferred) persists `nude_tensor_render_group`.
 * Order: DB cache → text heuristics on companion fields → Grok vision on portrait → default "realistic".
 */
export async function resolveNudeRenderGroupForCompanion(
  getEnv: (k: string) => string | undefined,
  supabase: SupabaseClient,
  companionId: string,
  preloadedRow?: Record<string, unknown> | null,
): Promise<NudeRenderGroup> {
  const row = preloadedRow ?? (await loadCompanionRow(supabase, companionId));
  if (!row) return "realistic";

  const cached = row.nude_tensor_render_group;
  if (cached === "realistic" || cached === "stylized") return cached;

  const textBlob = nudeStyleBlobFromRow(row);
  const fromText = inferNudeRenderGroupFromTextBlob(textBlob);
  if (fromText) {
    await persistRenderGroup(supabase, companionId, fromText);
    return fromText;
  }

  const pUrl = portraitUrlForVision(row);
  if (pUrl) {
    const fromVision = await classifyPortraitRenderGroupWithXai(getEnv, pUrl);
    if (fromVision) {
      await persistRenderGroup(supabase, companionId, fromVision);
      return fromVision;
    }
  }

  const fallback: NudeRenderGroup = "realistic";
  await persistRenderGroup(supabase, companionId, fallback);
  return fallback;
}
