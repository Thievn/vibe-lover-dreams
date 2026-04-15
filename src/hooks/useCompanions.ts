import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { companions as staticCompanions, type Companion } from "@/data/companions";
import { getStaticRarityForCatalog, normalizeCompanionRarity } from "@/lib/companionRarity";

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
  rarity_border_overlay_url: string | null;
  /** Community forge cards only — creator display name when they opted in */
  gallery_credit_name?: string | null;
}

function coerceStockRow(row: Record<string, unknown>): DbCompanion {
  const r = row as unknown as DbCompanion;
  return {
    ...r,
    rarity: normalizeCompanionRarity((row.rarity as string | undefined) ?? undefined),
    backstory: (row.backstory as string | undefined) ?? "",
    static_image_url: (row.static_image_url as string | null | undefined) ?? null,
    animated_image_url: (row.animated_image_url as string | null | undefined) ?? null,
    rarity_border_overlay_url: (row.rarity_border_overlay_url as string | null | undefined) ?? null,
  };
}

function customRowToDbCompanion(row: Record<string, unknown>): DbCompanion {
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
    rarity_border_overlay_url: (row.rarity_border_overlay_url as string | null | undefined) ?? null,
  };
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
  return (data || []).map((row) => customRowToDbCompanion(row as Record<string, unknown>));
}

/** Current user's forged companions (private vault + drafts), not only public gallery rows */
async function fetchMyCustomCharacters(userId: string): Promise<DbCompanion[]> {
  const { data, error } = await supabase
    .from("custom_characters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my custom characters:", error);
    return [];
  }
  return (data || []).map((row) => customRowToDbCompanion(row as Record<string, unknown>));
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
    rarity_border_overlay_url: null,
  }));
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
  backstory: db.backstory?.trim() ? db.backstory : undefined,
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
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
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
