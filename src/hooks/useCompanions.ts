import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { companions as staticCompanions, type Companion } from "@/data/companions";
import { getStaticRarityForCatalog, normalizeCompanionRarity } from "@/lib/companionRarity";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { normalizeForgePersonality, type ForgePersonalityProfile } from "@/lib/forgePersonalityProfile";
import { generateTcgStatBlock, normalizeTcgStatBlock } from "@/lib/tcgStats";

export interface DbCompanion {
  id: string;
  name: string;
  tagline: string;
  gender: string;
  orientation: string;
  role: string;
  tags: string[];
  kinks: string[];
  appearance: string;
  personality: string;
  bio: string;
  system_prompt: string;
  fantasy_starters: { title: string; description: string }[];
  gradient_from: string;
  gradient_to: string;
  image_url: string | null;
  image_prompt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rarity: string;
  backstory: string;
  static_image_url: string | null;
  animated_image_url: string | null;
  /** When true and animated_image_url is MP4, profile/chat can show looping video */
  profile_loop_video_enabled: boolean;
  rarity_border_overlay_url: string | null;
  /** Community forge cards only — creator display name when they opted in */
  gallery_credit_name?: string | null;
  personality_archetypes?: string[] | null;
  vibe_theme_selections?: string[] | null;
  /** JSON object from forge Personalities section. */
  personality_forge?: ForgePersonalityProfile | Record<string, unknown> | null;
  /** Admin forge: listed in Discover but omitted from the user’s personal vault until pinned */
  exclude_from_personal_vault?: boolean;
  /** Forge row owner (custom_characters only). */
  user_id?: string | null;
  /** Default Grok TTS voice preset for forged companions. */
  tts_voice_preset?: string | null;
  nexus_cooldown_until?: string | null;
  lineage_parent_ids?: string[] | null;
  merge_stats?: Record<string, unknown> | null;
  is_nexus_hybrid?: boolean;
  tcg_stats?: Record<string, unknown> | null;
  /** Cached: Tensor nude generation model family (server-filled on first nude request). */
  nude_tensor_render_group?: "realistic" | "stylized" | null;
}

function coerceStockRow(row: Record<string, unknown>): DbCompanion {
  const r = row as unknown as DbCompanion;
  return {
    ...r,
    rarity: normalizeCompanionRarity((row.rarity as string | undefined) ?? undefined),
    backstory: (row.backstory as string | undefined) ?? "",
    static_image_url: (row.static_image_url as string | null | undefined) ?? null,
    animated_image_url: (row.animated_image_url as string | null | undefined) ?? null,
    profile_loop_video_enabled: Boolean(row.profile_loop_video_enabled),
    rarity_border_overlay_url: (row.rarity_border_overlay_url as string | null | undefined) ?? null,
    tcg_stats:
      row.tcg_stats && typeof row.tcg_stats === "object" ? (row.tcg_stats as Record<string, unknown>) : null,
  };
}

/** Maps a `custom_characters` DB row to `DbCompanion` (`id` is `cc-{uuid}`). Exported for admin forge editor. */
export function mapSupabaseCustomCharacterRow(row: Record<string, unknown>): DbCompanion {
  const startersRaw = row.fantasy_starters;
  const starters = Array.isArray(startersRaw)
    ? (startersRaw as Record<string, unknown>[])
        .map((s) => {
          if (!s || typeof s !== "object") return null;
          const description =
            (typeof s.description === "string" && s.description) ||
            (typeof s.message === "string" && s.message) ||
            "";
          const title =
            (typeof s.title === "string" && s.title.trim()) ||
            (typeof s.label === "string" && s.label.trim()) ||
            (typeof s.emoji === "string" && typeof s.label === "string" && `${s.emoji} ${s.label}`.trim()) ||
            (description ? description.trim().slice(0, 48) + (description.length > 48 ? "…" : "") : "");
          if (!title.trim()) return null;
          return { title: title.trim(), description: description.trim() };
        })
        .filter((x): x is { title: string; description: string } => x !== null)
    : [];

  return {
    id: `cc-${row.id as string}`,
    name: row.name as string,
    tagline: (row.tagline as string) || "",
    gender: (row.gender as string) || "—",
    orientation: (row.orientation as string) || "",
    role: (row.role as string) || "",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    kinks: Array.isArray(row.kinks) ? (row.kinks as string[]) : [],
    appearance: (row.appearance as string) || "",
    personality: (row.personality as string) || "",
    bio: (row.bio as string) || "",
    system_prompt: (row.system_prompt as string) || "",
    fantasy_starters: starters,
    gradient_from: (row.gradient_from as string) || "#7B2D8E",
    gradient_to: (row.gradient_to as string) || "#FF2D7B",
    image_url: (row.image_url as string | null) ?? (row.avatar_url as string | null) ?? null,
    image_prompt: (row.image_prompt as string | null) ?? null,
    is_active: true,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
    gallery_credit_name: (row.gallery_credit_name as string | null) ?? null,
    rarity: normalizeCompanionRarity((row.rarity as string | undefined) ?? undefined),
    backstory: (row.backstory as string | undefined) ?? "",
    static_image_url: (row.static_image_url as string | null | undefined) ?? null,
    animated_image_url: (row.animated_image_url as string | null | undefined) ?? null,
    profile_loop_video_enabled: Boolean(row.profile_loop_video_enabled),
    rarity_border_overlay_url: (row.rarity_border_overlay_url as string | null | undefined) ?? null,
    personality_archetypes: Array.isArray(row.personality_archetypes)
      ? (row.personality_archetypes as string[])
      : null,
    vibe_theme_selections: Array.isArray(row.vibe_theme_selections)
      ? (row.vibe_theme_selections as string[])
      : null,
    personality_forge:
      row.personality_forge && typeof row.personality_forge === "object"
        ? (row.personality_forge as Record<string, unknown>)
        : null,
    exclude_from_personal_vault: Boolean(row.exclude_from_personal_vault),
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    nexus_cooldown_until: (row.nexus_cooldown_until as string | null | undefined) ?? null,
    lineage_parent_ids: Array.isArray(row.lineage_parent_ids)
      ? (row.lineage_parent_ids as string[])
      : null,
    merge_stats:
      row.merge_stats && typeof row.merge_stats === "object"
        ? (row.merge_stats as Record<string, unknown>)
        : null,
    is_nexus_hybrid: Boolean(row.is_nexus_hybrid),
    tcg_stats:
      row.tcg_stats && typeof row.tcg_stats === "object" ? (row.tcg_stats as Record<string, unknown>) : null,
    tts_voice_preset: (row.tts_voice_preset as string | null | undefined) ?? null,
  };
}

/** If forge row has no portrait URL, reuse the latest generated_images row for this companion. */
async function attachLatestGeneratedPortraits(
  rawRows: Record<string, unknown>[],
  userId: string,
): Promise<void> {
  const need = rawRows.filter((r) => !r.image_url && !r.static_image_url && r.id);
  if (!need.length) return;
  const keys = need.map((r) => `cc-${String(r.id)}`);
  const { data, error } = await supabase
    .from("generated_images")
    .select("companion_id, image_url, created_at")
    .eq("user_id", userId)
    .in("companion_id", keys)
    .order("created_at", { ascending: false });
  if (error || !data?.length) return;
  const best = new Map<string, string>();
  for (const g of data) {
    const cid = g.companion_id;
    if (!cid || best.has(cid)) continue;
    if (g.image_url) best.set(cid, g.image_url);
  }
  for (const r of need) {
    const k = `cc-${String(r.id)}`;
    const url = best.get(k);
    if (url) r.image_url = url;
  }
}

async function fetchPublicCustomCharacters(): Promise<DbCompanion[]> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("is_public", true)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching public custom characters:", error);
    return [];
  }
  return (data || []).map((row) => mapSupabaseCustomCharacterRow(row as Record<string, unknown>));
}

/** Current user's forged companions (private vault + drafts), not only public gallery rows */
async function fetchMyCustomCharacters(userId: string): Promise<DbCompanion[]> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("user_id", userId)
    .or("exclude_from_personal_vault.is.null,exclude_from_personal_vault.eq.false")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my custom characters:", error);
    return [];
  }
  const raw = (data || []) as Record<string, unknown>[];
  await attachLatestGeneratedPortraits(raw, userId);
  return raw.map((row) => mapSupabaseCustomCharacterRow(row));
}

function staticListToDb(): DbCompanion[] {
  return staticCompanions.map((c) => ({
    id: c.id,
    name: c.name,
    tagline: c.tagline,
    gender: c.gender,
    orientation: c.orientation,
    role: c.role,
    tags: c.tags,
    kinks: c.kinks,
    appearance: c.appearance,
    personality: c.personality,
    bio: c.bio,
    system_prompt: c.systemPrompt,
    fantasy_starters: c.fantasyStarters,
    gradient_from: c.gradientFrom,
    gradient_to: c.gradientTo,
    image_url: null,
    image_prompt: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rarity: getStaticRarityForCatalog(c.id),
    backstory: c.backstory ?? "",
    static_image_url: null,
    animated_image_url: null,
    profile_loop_video_enabled: false,
    rarity_border_overlay_url: null,
    tcg_stats: generateTcgStatBlock(c.id, getStaticRarityForCatalog(c.id)) as unknown as Record<string, unknown>,
  }));
}

function parseMergeStats(raw: Record<string, unknown> | null | undefined): NonNullable<Companion["mergeStats"]> {
  const c = (k: string) => {
    const v = raw?.[k];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  };
  return {
    compatibility: c("compatibility"),
    resonance: c("resonance"),
    pulse: c("pulse"),
    affinity: c("affinity"),
  };
}

// Convert DB companion to the app's Companion interface
export const dbToCompanion = (db: DbCompanion): Companion => ({
  id: db.id,
  name: db.name,
  tagline: db.tagline,
  gender: db.gender,
  orientation: db.orientation,
  role: db.role,
  tags: db.tags,
  kinks: db.kinks,
  appearance: db.appearance,
  personality: db.personality,
  bio: db.bio,
  systemPrompt: db.system_prompt,
  fantasyStarters: db.fantasy_starters,
  gradientFrom: db.gradient_from,
  gradientTo: db.gradient_to,
  rarity: normalizeCompanionRarity(db.rarity),
  rarityBorderOverlayUrl: db.rarity_border_overlay_url ?? null,
  backstory: db.backstory?.trim() ? db.backstory : undefined,
  portraitUrl: galleryStaticPortraitUrl(db, db.id) ?? null,
  isNexusHybrid: Boolean(db.is_nexus_hybrid),
  mergeStats: db.is_nexus_hybrid && db.merge_stats ? parseMergeStats(db.merge_stats) : undefined,
  nexusCooldownUntil: db.nexus_cooldown_until ?? undefined,
  lineageParentIds: db.lineage_parent_ids?.length
    ? db.lineage_parent_ids.map((id) => `cc-${id}`)
    : undefined,
  tcgStats: normalizeTcgStatBlock(db.tcg_stats as unknown) ?? undefined,
  personalityForge: db.personality_forge ? normalizeForgePersonality(db.personality_forge) : null,
});

export const useCompanions = () => {
  return useQuery({
    queryKey: ["companions"],
    queryFn: async (): Promise<DbCompanion[]> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;

      const [companionsRes, publicCustoms, mineRes] = await Promise.all([
        supabase.from("companions").select("*").eq("is_active", true).order("name"),
        fetchPublicCustomCharacters(),
        uid ? fetchMyCustomCharacters(uid) : Promise.resolve([] as DbCompanion[]),
      ]);

      const mineIds = new Set(mineRes.map((c) => c.id));
      const publicOthers = publicCustoms.filter((c) => !mineIds.has(c.id));

      if (companionsRes.error) {
        console.error("Error fetching companions:", companionsRes.error);
        const staticDb = staticListToDb();
        return [...staticDb, ...mineRes, ...publicOthers];
      }

      const stock = ((companionsRes.data || []) as Record<string, unknown>[]).map(coerceStockRow);
      return [...stock, ...mineRes, ...publicOthers];
    },
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
};

// Admin hook - fetches ALL companions including inactive
export const useAdminCompanions = () => {
  return useQuery({
    queryKey: ["admin-companions"],
    queryFn: async (): Promise<DbCompanion[]> => {
      const { data, error } = await supabase.from("companions").select("*").order("name");

      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(coerceStockRow);
    },
  });
};
