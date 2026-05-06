import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAdminCompanions, mapSupabaseCustomCharacterRow, type DbCompanion } from "@/hooks/useCompanions";
import { COMPANION_RARITIES, defaultProfileGradientForRarity, normalizeCompanionRarity } from "@/lib/companionRarity";
import { buildNexusStoredDisplayTraits, serializeBaseDisplayTraitsForInsert } from "@/lib/vibeDisplayTraits";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Save, RefreshCw, Plus, Eye, EyeOff, ChevronDown, ChevronUp,
  Loader2, X, ImageIcon, Palette, ArrowLeft, Sparkles, Trash2, Waves, Video, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { withAsyncTimeout } from "@/lib/withAsyncTimeout";
import { formatSupabaseError } from "@/lib/supabaseError";
import { adminHardDeleteCompanion } from "@/lib/adminHardDeleteCompanion";
import { AdminCompanionPortraitPreview } from "@/components/admin/AdminCompanionPortraitPreview";
import { AdminLoopingVideoBlock } from "@/components/admin/AdminLoopingVideoBlock";
import { galleryStaticPortraitUrl, isVideoPortraitUrl } from "@/lib/companionMedia";
import { IDENTITY_ANATOMY_CHOICES, normalizeIdentityAnatomyDetail } from "@/lib/identityAnatomyDetail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = "list" | "edit" | "create";

type HallDeleteTarget =
  | { kind: "forge"; uuid: string; name: string; userId: string }
  | { kind: "stock"; id: string; name: string };

type CharacterStockSortKey = "name" | "newest" | "rarity";
type CharacterMediaFilterKey = "all" | "has_loop" | "needs_loop";

const emptyCompanion: Omit<DbCompanion, "created_at" | "updated_at"> = {
  id: "",
  name: "",
  tagline: "",
  gender: "Female",
  identity_anatomy_detail: null,
  orientation: "Bisexual",
  role: "Switch",
  tags: [],
  kinks: [],
  appearance: "",
  personality: "",
  bio: "",
  system_prompt: "",
  fantasy_starters: [],
  gradient_from: "#7B2D8E",
  gradient_to: "#FF2D7B",
  image_url: null,
  image_prompt: null,
  is_active: true,
  rarity: "common",
  backstory: "",
  static_image_url: null,
  animated_image_url: null,
  profile_loop_video_enabled: false,
  rarity_border_overlay_url: null,
  display_traits: [] as unknown[],
};

/**
 * Recompute storable `display_traits` when tier changes. Non-Nexus: keyword-aware roll by rarity count.
 * Nexus: re-run nexus layout using current row as both parents (same as “remix in place” in admin).
 */
function computeDisplayTraitsForRarity(
  companion: DbCompanion,
  newRarity: string,
  getMerged: (field: keyof DbCompanion) => unknown,
): unknown {
  const r = normalizeCompanionRarity(newRarity);
  if (getMerged("is_nexus_hybrid")) {
    const id = companion.id;
    const uuid = id.startsWith("cc-") ? id.slice(3) : id;
    return buildNexusStoredDisplayTraits({
      childRarity: r,
      childIdUuid: uuid,
      parentA: {
        display_traits: getMerged("display_traits") ?? companion.display_traits,
        tags: (getMerged("tags") as string[]) ?? companion.tags,
        personality: String(getMerged("personality") ?? companion.personality ?? ""),
      },
      parentB: {
        display_traits: getMerged("display_traits") ?? companion.display_traits,
        tags: (getMerged("tags") as string[]) ?? companion.tags,
        personality: String(getMerged("personality") ?? companion.personality ?? ""),
      },
    });
  }
  return serializeBaseDisplayTraitsForInsert({
    seed: companion.id,
    tags: (getMerged("tags") as string[]) ?? companion.tags,
    kinks: (getMerged("kinks") as string[]) ?? companion.kinks,
    personality: String(getMerged("personality") ?? companion.personality ?? ""),
    bio: String(getMerged("bio") ?? companion.bio ?? ""),
    rarity: r,
  });
}

/** Allowed columns on `custom_characters` when saving from admin forge editor. */
const CUSTOM_CHARACTER_UPDATE_KEYS = new Set([
  "name",
  "tagline",
  "gender",
  "identity_anatomy_detail",
  "orientation",
  "role",
  "tags",
  "kinks",
  "appearance",
  "personality",
  "bio",
  "backstory",
  "system_prompt",
  "fantasy_starters",
  "gradient_from",
  "gradient_to",
  "image_prompt",
  "image_url",
  "avatar_url",
  "static_image_url",
  "animated_image_url",
  "profile_loop_video_enabled",
  "rarity_border_overlay_url",
  "rarity",
  "display_traits",
  "gallery_credit_name",
  "exclude_from_personal_vault",
  "personality_archetypes",
  "personality_forge",
  "vibe_theme_selections",
]);

function adminStockNeedsLoopVideo(c: DbCompanion): boolean {
  const anim = c.animated_image_url?.trim();
  if (anim && isVideoPortraitUrl(anim)) return false;
  return Boolean(galleryStaticPortraitUrl(c, c.id));
}

function adminForgeRowNeedsLoopVideo(row: {
  animated_image_url?: string | null;
  static_image_url?: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
}): boolean {
  const anim = row.animated_image_url?.trim();
  if (anim && isVideoPortraitUrl(anim)) return false;
  return Boolean(
    (row.static_image_url && row.static_image_url.trim()) ||
      (row.image_url && row.image_url.trim()) ||
      (row.avatar_url && row.avatar_url.trim()),
  );
}

/** True when `animated_image_url` is an MP4/WebM/MOV (looping portrait was generated). */
function hasProfileLoopMp4(row: { animated_image_url?: string | null }): boolean {
  const anim = row.animated_image_url?.trim();
  return Boolean(anim && isVideoPortraitUrl(anim));
}

function AdminLoopVideoBadge({
  hasMp4,
  loopEnabled,
  compact,
}: {
  hasMp4: boolean;
  loopEnabled?: boolean;
  compact?: boolean;
}) {
  if (!hasMp4) return null;
  const onProfile = loopEnabled !== false;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        onProfile
          ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-200"
          : "border-amber-400/35 bg-amber-500/12 text-amber-100/90",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
      )}
      title={
        onProfile
          ? "Looping MP4 exists and is allowed on profile/chat"
          : "MP4 exists but “show on profile” is off in the editor"
      }
    >
      <Video className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      Loop MP4
      {!onProfile ? " · off" : ""}
    </span>
  );
}

function LabeledRegenWrap({
  label,
  busy,
  onRegen,
  children,
}: {
  label: string;
  busy: boolean;
  onRegen: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={() => void onRegen()}
          disabled={busy}
          title={`Regenerate ${label} from current theme (Grok)`}
          className="p-1.5 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
        </button>
      </div>
      {children}
    </div>
  );
}

type AdminVibRow = {
  id: string;
  display_name: string;
  sort_order: number;
  is_abyssal_signature: boolean;
  pool_pattern_id: string;
  pool_index: number | null;
  internal_label: string | null;
};

function AdminToyPatternsSection({ companionId }: { companionId: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [addPoolIndex, setAddPoolIndex] = useState(1);

  const { data: pool = [] } = useQuery({
    queryKey: ["vibration-pattern-pool"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibration_pattern_pool")
        .select("id, pool_index, internal_label")
        .order("pool_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-vib-rows", companionId],
    queryFn: async (): Promise<AdminVibRow[]> => {
      const { data: raws, error: e1 } = await supabase
        .from("companion_vibration_patterns")
        .select("id, display_name, sort_order, is_abyssal_signature, pool_pattern_id")
        .eq("companion_id", companionId)
        .order("sort_order", { ascending: true });
      if (e1) throw e1;
      if (!raws?.length) return [];
      const poolIds = [...new Set(raws.map((r) => r.pool_pattern_id))];
      const { data: pools, error: e2 } = await supabase
        .from("vibration_pattern_pool")
        .select("id, pool_index, internal_label")
        .in("id", poolIds);
      if (e2) throw e2;
      const byPool = new Map((pools ?? []).map((p) => [p.id, p]));
      return raws.map((r) => {
        const p = byPool.get(r.pool_pattern_id);
        return {
          id: r.id,
          display_name: r.display_name,
          sort_order: r.sort_order,
          is_abyssal_signature: r.is_abyssal_signature,
          pool_pattern_id: r.pool_pattern_id,
          pool_index: p?.pool_index ?? null,
          internal_label: p?.internal_label ?? null,
        };
      });
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", companionId] });
    void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns", companionId] });
  }, [queryClient, companionId]);

  const reloadFromRarity = async () => {
    setBusy("reload");
    try {
      const { error } = await supabase.rpc("admin_reassign_vibration_patterns", {
        p_companion_id: companionId,
      });
      if (error) throw error;
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reload failed");
    } finally {
      setBusy(null);
    }
  };

  const removeRow = async (rowId: string) => {
    setBusy(rowId);
    try {
      const { error } = await supabase.from("companion_vibration_patterns").delete().eq("id", rowId);
      if (error) throw error;
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const addPattern = async () => {
    const slot = pool.find((p) => p.pool_index === addPoolIndex);
    if (!slot) {
      toast.error("Pool not loaded.");
      return;
    }
    setBusy("add");
    try {
      const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const next = maxSort + 1;
      if (next > 20) {
        toast.error("Maximum 20 pattern slots per companion.");
        return;
      }
      const { error } = await supabase.from("companion_vibration_patterns").insert({
        companion_id: companionId,
        pool_pattern_id: slot.id,
        display_name: slot.internal_label,
        sort_order: next,
        is_abyssal_signature: slot.pool_index === 50,
      });
      if (error) throw error;
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Waves className="h-4 w-4 text-violet-300" />
        <h4 className="text-sm font-bold text-foreground">Lovense toy patterns (chat)</h4>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Rarity sets the default slot count (common 1 … abyssal 5 + signature). Use{" "}
        <strong className="text-foreground/90">Reload from rarity</strong> to wipe custom rows and rebuild. Add/remove
        individual pool entries below; changes apply server-side immediately.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy === "reload"}
          onClick={() => void reloadFromRarity()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-600/90 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 border border-violet-400/30"
        >
          {busy === "reload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Reload from rarity
        </button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading assignments…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-amber-200/90">
          No patterns for this ID. Save rarity/name on the stock row (auto-trigger) or click Reload from rarity / Repair
          missing (list).
        </p>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5 text-xs"
            >
              <span className="text-muted-foreground w-6 shrink-0">{r.sort_order}</span>
              <input
                type="text"
                defaultValue={r.display_name}
                key={r.id}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || v === r.display_name) return;
                  void supabase
                    .from("companion_vibration_patterns")
                    .update({ display_name: v })
                    .eq("id", r.id)
                    .then(({ error }) => {
                      if (error) toast.error(error.message);
                      else invalidate();
                    });
                }}
                className="flex-1 min-w-0 rounded border border-border/80 bg-muted/40 px-2 py-1 text-foreground"
              />
              <span className="hidden sm:inline text-[10px] text-muted-foreground truncate max-w-[140px]" title={r.internal_label ?? ""}>
                #{r.pool_index ?? "?"} {r.internal_label ?? ""}
              </span>
              {r.is_abyssal_signature && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-200 shrink-0">sig</span>
              )}
              <button
                type="button"
                title="Remove this slot"
                disabled={busy === r.id}
                onClick={() => void removeRow(r.id)}
                className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive shrink-0 disabled:opacity-50"
              >
                {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-border/40">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Pool preset</label>
          <select
            value={addPoolIndex}
            onChange={(e) => setAddPoolIndex(Number(e.target.value))}
            className="rounded-lg bg-muted border border-border px-2 py-1.5 text-xs text-foreground min-w-[12rem]"
          >
            {pool.map((p) => (
              <option key={p.id} value={p.pool_index}>
                {p.pool_index}. {p.internal_label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busy === "add" || pool.length === 0}
          onClick={() => void addPattern()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-400/40 text-violet-200 text-xs font-medium hover:bg-violet-500/10 disabled:opacity-50"
        >
          {busy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add slot
        </button>
      </div>
    </div>
  );
}

const CompanionManager = () => {
  const { data: companions, isLoading, error } = useAdminCompanions();
  const { data: forgedRows = [], isLoading: forgedLoading } = useQuery({
    queryKey: ["admin-custom-characters"],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from("custom_characters")
        .select(
          "id,name,user_id,is_public,approved,created_at,image_url,avatar_url,static_image_url,animated_image_url,profile_loop_video_enabled,tagline,rarity,gradient_from,gradient_to,rarity_border_overlay_url",
        )
        .order("created_at", { ascending: false })
        .limit(80);
      if (qErr) throw qErr;
      return data ?? [];
    },
  });
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [stockSort, setStockSort] = useState<CharacterStockSortKey>("name");
  const [mediaFilter, setMediaFilter] = useState<CharacterMediaFilterKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Partial<DbCompanion>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [createData, setCreateData] = useState({ ...emptyCompanion, id: `custom-${Date.now()}` });
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [forgeBusyId, setForgeBusyId] = useState<string | null>(null);
  const [forgeVibBusyId, setForgeVibBusyId] = useState<string | null>(null);
  const [loreBusyId, setLoreBusyId] = useState<string | null>(null);
  const [repairVibBusy, setRepairVibBusy] = useState(false);
  const [bulkLoopBusy, setBulkLoopBusy] = useState(false);
  /** When set, edit view uses this row (e.g. full forge profile) instead of catalog list lookup. */
  const [editOverride, setEditOverride] = useState<DbCompanion | null>(null);
  const [forgeEditLoadingId, setForgeEditLoadingId] = useState<string | null>(null);
  const [sectionBusy, setSectionBusy] = useState<Record<string, boolean>>({});
  const [hallDeleteTarget, setHallDeleteTarget] = useState<HallDeleteTarget | null>(null);
  const [hallDeleteBusy, setHallDeleteBusy] = useState(false);
  const lastUrlEditOpened = useRef<string | null>(null);

  // Auto-fill state
  const [autoFillPrompt, setAutoFillPrompt] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [designLabHints, setDesignLabHints] = useState("");

  const syncEditToUrl = useCallback((id: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("edit", id);
        else next.delete("edit");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const openForgeAdminEdit = useCallback(
    async (uuid: string) => {
      setForgeEditLoadingId(uuid);
      try {
        const { data, error: rowErr } = await supabase.from("custom_characters").select("*").eq("id", uuid).maybeSingle();
        if (rowErr) throw rowErr;
        if (!data) {
          toast.error("Forge row not found.");
          return;
        }
        const mapped = mapSupabaseCustomCharacterRow(data as Record<string, unknown>);
        setEditOverride(mapped);
        setEditingId(mapped.id);
        setViewMode("edit");
        syncEditToUrl(mapped.id);
      } catch (e: unknown) {
        lastUrlEditOpened.current = null;
        toast.error(e instanceof Error ? e.message : "Could not load forge row");
      } finally {
        setForgeEditLoadingId(null);
      }
    },
    [syncEditToUrl],
  );

  useEffect(() => {
    const raw = searchParams.get("edit");
    if (!raw) {
      lastUrlEditOpened.current = null;
      return;
    }
    if (viewMode !== "list") return;
    if (lastUrlEditOpened.current === raw) return;
    lastUrlEditOpened.current = raw;
    if (raw.startsWith("cc-")) {
      void openForgeAdminEdit(raw.replace(/^cc-/, ""));
    } else {
      setEditOverride(null);
      setEditingId(raw);
      setViewMode("edit");
    }
  }, [searchParams, viewMode, openForgeAdminEdit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading companions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">Failed to load companions. Please try again.</p>
      </div>
    );
  }

  const searchLower = search.trim().toLowerCase();

  const forgedFiltered = (forgedRows || []).filter((row) => {
    const fr = row as Record<string, unknown>;
    const name = String(fr.name ?? "").toLowerCase();
    const tagline = String(fr.tagline ?? "").toLowerCase();
    const uid = String(fr.user_id ?? "").toLowerCase();
    const idStr = String(fr.id ?? "").toLowerCase();
    if (searchLower) {
      const matchesSearch =
        name.includes(searchLower) ||
        tagline.includes(searchLower) ||
        uid.includes(searchLower) ||
        idStr.includes(searchLower) ||
        `cc-${idStr}`.includes(searchLower);
      if (!matchesSearch) return false;
    }
    const loopRow = {
      animated_image_url: typeof fr.animated_image_url === "string" ? fr.animated_image_url : null,
      static_image_url: typeof fr.static_image_url === "string" ? fr.static_image_url : null,
      image_url: typeof fr.image_url === "string" ? fr.image_url : null,
      avatar_url: typeof fr.avatar_url === "string" ? fr.avatar_url : null,
    };
    if (mediaFilter === "has_loop" && !hasProfileLoopMp4(loopRow)) return false;
    if (mediaFilter === "needs_loop" && !adminForgeRowNeedsLoopVideo(loopRow)) return false;
    return true;
  });

  const stockSearchMatches = (c: DbCompanion) => {
    if (!searchLower) return true;
    const bio = (c.bio || "").toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      (c.tagline || "").toLowerCase().includes(searchLower) ||
      c.tags.some((t) => t.toLowerCase().includes(searchLower)) ||
      c.kinks.some((k) => k.toLowerCase().includes(searchLower)) ||
      c.gender.toLowerCase().includes(searchLower) ||
      c.role.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower) ||
      bio.includes(searchLower)
    );
  };

  const stockFiltered = (companions || []).filter((c) => {
    if (!stockSearchMatches(c)) return false;
    if (mediaFilter === "has_loop" && !hasProfileLoopMp4(c)) return false;
    if (mediaFilter === "needs_loop" && !adminStockNeedsLoopVideo(c)) return false;
    return true;
  });

  const stockSorted = [...stockFiltered].sort((a, b) => {
    if (stockSort === "name") return a.name.localeCompare(b.name);
    if (stockSort === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    const ia = COMPANION_RARITIES.indexOf(normalizeCompanionRarity(a.rarity));
    const ib = COMPANION_RARITIES.indexOf(normalizeCompanionRarity(b.rarity));
    return ib - ia;
  });

  const forgeLoopStats = {
    withMp4: (forgedRows || []).filter((r) =>
      hasProfileLoopMp4({
        animated_image_url: typeof (r as Record<string, unknown>).animated_image_url === "string"
          ? (r as Record<string, unknown>).animated_image_url as string
          : null,
      }),
    ).length,
    needs: (forgedRows || []).filter((r) => {
      const fr = r as Record<string, unknown>;
      return adminForgeRowNeedsLoopVideo({
        animated_image_url: typeof fr.animated_image_url === "string" ? fr.animated_image_url : null,
        static_image_url: typeof fr.static_image_url === "string" ? fr.static_image_url : null,
        image_url: typeof fr.image_url === "string" ? fr.image_url : null,
        avatar_url: typeof fr.avatar_url === "string" ? fr.avatar_url : null,
      });
    }).length,
  };
  const stockLoopStats = {
    withMp4: (companions || []).filter((c) => hasProfileLoopMp4(c)).length,
    needs: (companions || []).filter((c) => adminStockNeedsLoopVideo(c)).length,
  };

  const getEdit = (id: string): Partial<DbCompanion> => editData[id] || {};
  const setField = (id: string, field: string, value: any) => {
    setEditData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveCompanion = async (companion: DbCompanion) => {
    const changes = getEdit(companion.id);
    if (Object.keys(changes).length === 0) {
      return;
    }
    setSaving((prev) => ({ ...prev, [companion.id]: true }));
    try {
      const isForge = companion.id.startsWith("cc-");
      if (isForge) {
        const uuid = companion.id.slice(3);
        const patch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(changes)) {
          if (CUSTOM_CHARACTER_UPDATE_KEYS.has(k)) patch[k] = v;
        }
        if (Object.keys(patch).length === 0) {
          return;
        }
        const { error } = await supabase.from("custom_characters").update(patch as any).eq("id", uuid);
        if (error) throw error;
        if ("rarity" in changes || "name" in changes) {
          void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns", companion.id] });
          void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", companion.id] });
        }
      } else {
        const { error } = await supabase
          .from("companions")
          .update(changes as any)
          .eq("id", companion.id);
        if (error) throw error;
        if ("rarity" in changes || "name" in changes) {
          void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns", companion.id] });
          void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", companion.id] });
        }
      }
      setEditData((prev) => {
        const next = { ...prev };
        delete next[companion.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving((prev) => ({ ...prev, [companion.id]: false }));
    }
  };

  const regenSection = async (companion: DbCompanion, section: string) => {
    const rk = `${companion.id}::${section}`;
    setSectionBusy((prev) => ({ ...prev, [rk]: true }));
    try {
      const source = companion.id.startsWith("cc-") ? "forge" : "catalog";
      const { data, error } = await supabase.functions.invoke("admin-regenerate-companion-section", {
        body: { source, companionAppId: companion.id, section },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));
      if (data?.fields && typeof data.fields === "object") {
        setEditData((prev) => ({
          ...prev,
          [companion.id]: { ...prev[companion.id], ...(data.fields as Record<string, unknown>) },
        }));
      }
      if (section === "portrait" && typeof data?.publicImageUrl === "string") {
        setEditData((prev) => ({
          ...prev,
          [companion.id]: {
            ...prev[companion.id],
            image_url: data.publicImageUrl,
            static_image_url: data.publicImageUrl,
          },
        }));
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setSectionBusy((prev) => {
        const next = { ...prev };
        delete next[rk];
        return next;
      });
    }
  };

  const repairMissingVibrationPatterns = async () => {
    setRepairVibBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_backfill_missing_vibration_patterns");
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows"] });
      void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Repair failed");
    } finally {
      setRepairVibBusy(false);
    }
  };

  const bulkGenerateMissingLoopVideos = async () => {
    if (bulkLoopBusy) return;
    const stockIds = (companions || []).filter(adminStockNeedsLoopVideo).map((c) => c.id);
    const { data: forgeRows, error } = await supabase
      .from("custom_characters")
      .select("id, static_image_url, image_url, avatar_url, animated_image_url");
    if (error) {
      toast.error(error.message);
      return;
    }
    const forgeIds = (forgeRows || []).filter(adminForgeRowNeedsLoopVideo).map((r) => `cc-${r.id}`);
    const allIds = [...stockIds, ...forgeIds];
    if (allIds.length === 0) {
      toast.message("Everyone with a portrait already has an MP4 loop (or has no still to generate from).");
      return;
    }
    if (
      !window.confirm(
        `Generate ${allIds.length} looping profile video(s) via xAI? Runs one companion at a time with a short pause — this can take a while.`,
      )
    ) {
      return;
    }
    setBulkLoopBusy(true);
    const toastId = toast.loading(`Loop videos: 0/${allIds.length}…`);
    let ok = 0;
    let fail = 0;
    try {
      for (let i = 0; i < allIds.length; i++) {
        const companionId = allIds[i];
        try {
          const { data, error: fnErr } = await supabase.functions.invoke("generate-profile-loop-video", {
            body: { companionId },
          });
          if (fnErr) throw new Error(await getEdgeFunctionInvokeMessage(fnErr, data));
          const errMsg = (data as { error?: string })?.error;
          if (errMsg) throw new Error(errMsg);
          ok++;
        } catch {
          fail++;
        }
        toast.loading(`Loop videos: ${ok + fail}/${allIds.length} (ok ${ok}, fail ${fail})`, { id: toastId });
        if (i < allIds.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      toast.success(`Loop videos finished: ${ok} ok, ${fail} failed`, { id: toastId, duration: 8000 });
      void queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Batch stopped", { id: toastId });
    } finally {
      setBulkLoopBusy(false);
    }
  };

  const reloadForgeVibrationPatterns = async (customUuid: string) => {
    setForgeVibBusyId(customUuid);
    try {
      const { error } = await supabase.rpc("admin_reassign_vibration_patterns", {
        p_companion_id: `cc-${customUuid}`,
      });
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", `cc-${customUuid}`] });
      void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns", `cc-${customUuid}`] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reload failed");
    } finally {
      setForgeVibBusyId(null);
    }
  };

  const updateForgeRow = async (
    id: string,
    patch: { approved?: boolean; is_public?: boolean },
  ) => {
    setForgeBusyId(id);
    try {
      const { error } = await supabase.from("custom_characters").update(patch).eq("id", id);
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setForgeBusyId(null);
    }
  };

  const refreshLoreWithGrok = async (companion: DbCompanion) => {
    setLoreBusyId(companion.id);
    try {
      const hints = [
        `Keep or gently refine this roster name: ${companion.name}`,
        `Tagline: ${companion.tagline}`,
        `Gender: ${companion.gender}; orientation: ${companion.orientation}; role: ${companion.role}`,
        `Personality: ${companion.personality}`,
        `Current bio (expand, do not shorten into bullet tags): ${companion.bio}`,
        `Current backstory (replace with deeper lore if thin): ${companion.backstory || "(empty)"}`,
        `Appearance (rewrite as 3+ flowing sentences, not keyword spam): ${companion.appearance}`,
        "Return a FULL premium profile via tool: bio = 2 vivid paragraphs; backstory = 4 paragraphs with wound/want/secret/sensory scenes; system_prompt = complete chat charter; fantasy_starters = exactly 4; image_prompt = one dense SFW portrait paragraph.",
      ].join("\n\n");
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: { mode: "companion_design_lab", prompt: hints },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));
      const fields = data?.fields as Record<string, unknown> | undefined;
      if (!fields) throw new Error("No fields returned");

      const fantasy_starters = normalizeFantasyStartersFromFields(fields.fantasy_starters);
      setEditData((prev) => ({
        ...prev,
        [companion.id]: {
          ...prev[companion.id],
          ...(typeof fields.name === "string" ? { name: String(fields.name).slice(0, 120) } : {}),
          ...(typeof fields.tagline === "string" ? { tagline: String(fields.tagline).slice(0, 240) } : {}),
          ...(typeof fields.bio === "string" ? { bio: String(fields.bio).slice(0, 12000) } : {}),
          ...(typeof fields.backstory === "string" ? { backstory: String(fields.backstory).slice(0, 24000) } : {}),
          ...(typeof fields.appearance === "string" ? { appearance: String(fields.appearance).slice(0, 12000) } : {}),
          ...(typeof fields.system_prompt === "string" ? { system_prompt: String(fields.system_prompt).slice(0, 32000) } : {}),
          ...(fantasy_starters.length ? { fantasy_starters } : {}),
          ...(typeof fields.image_prompt === "string" ? { image_prompt: String(fields.image_prompt).slice(0, 8000) } : {}),
          ...(Array.isArray(fields.tags) ? { tags: (fields.tags as string[]).map(String).slice(0, 24) } : {}),
          ...(Array.isArray(fields.kinks) ? { kinks: (fields.kinks as string[]).map(String).slice(0, 16) } : {}),
        },
      }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lore refresh failed");
    } finally {
      setLoreBusyId(null);
    }
  };

  const regenerateImage = async (companion: DbCompanion) => {
    const imagePrompt =
      (getEdit(companion.id)?.image_prompt as string | null | undefined) ??
      companion.image_prompt ??
      `SFW portrait: ${companion.name}. ${companion.appearance}`.slice(0, 4000);
    if (!String(imagePrompt).trim()) {
      toast.error("Need appearance or image prompt to generate a portrait.");
      return;
    }
    setGenerating((prev) => ({ ...prev, [companion.id]: true }));
    try {
      const isForge = companion.id.startsWith("cc-");
      const { data, error } = await supabase.functions.invoke("generate-companion-image", {
        body: isForge
          ? {
              target: "forge",
              forgeRowUuid: companion.id.replace(/^cc-/, ""),
              imagePrompt: String(imagePrompt).trim(),
              contentTier: "forge_preview_sfw",
            }
          : {
              target: "catalog",
              companionId: companion.id,
              imagePrompt: String(imagePrompt).trim(),
              contentTier: "forge_preview_sfw",
            },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(data.error);
      if (typeof data?.publicImageUrl === "string") {
        setEditData((prev) => ({
          ...prev,
          [companion.id]: {
            ...prev[companion.id],
            image_url: data.publicImageUrl,
            static_image_url: data.publicImageUrl,
          },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    } finally {
      setGenerating((prev) => ({ ...prev, [companion.id]: false }));
    }
  };

  const toggleActive = async (companion: DbCompanion) => {
    const newVal = !companion.is_active;
    const { error } = await supabase
      .from("companions")
      .update({ is_active: newVal } as any)
      .eq("id", companion.id);
    if (error) {
      toast.error("Toggle failed");
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
    }
  };

  const openEdit = (id: string) => {
    setEditOverride(null);
    setEditingId(id);
    setViewMode("edit");
    syncEditToUrl(id);
  };

  const openCreate = () => {
    setCreateData({ ...emptyCompanion, id: `custom-${Date.now()}` });
    setAutoFillPrompt("");
    setViewMode("create");
  };

  const backToList = () => {
    setViewMode("list");
    setEditingId(null);
    setEditOverride(null);
    syncEditToUrl(null);
  };

  const confirmHallHardDelete = async () => {
    if (!hallDeleteTarget) return;
    setHallDeleteBusy(true);
    try {
      const uid = hallDeleteTarget.kind === "forge" ? hallDeleteTarget.userId.trim() : "";
      const res =
        hallDeleteTarget.kind === "forge"
          ? await adminHardDeleteCompanion(
              supabase,
              {
                kind: "forge",
                uuid: hallDeleteTarget.uuid,
                publicId: `cc-${hallDeleteTarget.uuid}`,
              },
              uid
                ? { forgePortraitCleanup: { userId: uid, portraitName: hallDeleteTarget.name } }
                : undefined,
            )
          : await adminHardDeleteCompanion(supabase, { kind: "stock", catalogId: hallDeleteTarget.id });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`“${hallDeleteTarget.name}” was permanently deleted.`);
      const removedPublicId =
        hallDeleteTarget.kind === "forge" ? `cc-${hallDeleteTarget.uuid}` : hallDeleteTarget.id;
      setEditData((prev) => {
        const next = { ...prev };
        delete next[removedPublicId];
        return next;
      });
      if (viewMode === "edit" && editingId === removedPublicId) {
        backToList();
      }
      setHallDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } finally {
      setHallDeleteBusy(false);
    }
  };

  const createCompanion = async () => {
    if (!createData.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setCreatingLoading(true);
    try {
      const { error } = await withAsyncTimeout(
        supabase
          .from("companions")
          .insert({
            id: createData.id,
            name: createData.name,
            tagline: createData.tagline,
            gender: createData.gender,
            orientation: createData.orientation,
            role: createData.role,
            tags: createData.tags,
            kinks: createData.kinks,
            appearance: createData.appearance,
            personality: createData.personality,
            bio: createData.bio,
            system_prompt: createData.system_prompt,
            fantasy_starters: createData.fantasy_starters as any,
            gradient_from: createData.gradient_from,
            gradient_to: createData.gradient_to,
            image_prompt: createData.image_prompt,
            is_active: createData.is_active,
            rarity: createData.rarity,
            backstory: createData.backstory,
            static_image_url: createData.static_image_url,
            animated_image_url: createData.animated_image_url,
            profile_loop_video_enabled: createData.profile_loop_video_enabled,
            rarity_border_overlay_url: createData.rarity_border_overlay_url,
            image_url: createData.image_url,
            display_traits: createData.display_traits ?? [],
          } as any),
        60_000,
        "Creating catalog companion (database)",
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      backToList();
    } catch (err: unknown) {
      toast.error(`Create failed: ${formatSupabaseError(err)}`);
    } finally {
      setCreatingLoading(false);
    }
  };

  const normalizeFantasyStartersFromFields = (raw: unknown): { title: string; description: string }[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[])
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const description = String(s.description ?? s.message ?? "").trim();
        const title =
          String(s.title ?? s.label ?? "").trim() ||
          (description ? `${description.slice(0, 44)}${description.length > 44 ? "…" : ""}` : "");
        if (!title) return null;
        return { title, description };
      })
      .filter((x): x is { title: string; description: string } => x !== null);
  };

  /** Full-catalog roll — replaces the create form with a fresh Grok-designed companion (admin library builder). */
  const rollPremiumCatalogCompanion = async () => {
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: {
          mode: "companion_design_lab",
          prompt:
            designLabHints.trim() ||
            "Surprise me with one completely original companion — maximize species, era, subculture, and hobby diversity.",
        },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));
      const fields = data?.fields as Record<string, unknown> | undefined;
      if (!fields || typeof fields.name !== "string") throw new Error("No profile returned");

      const slug =
        String(fields.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "companion";
      const fantasy_starters = normalizeFantasyStartersFromFields(fields.fantasy_starters);
      const newId = `${slug}-${Date.now().toString(36)}`;

      setCreateData({
        ...emptyCompanion,
        id: newId,
        name: String(fields.name || "").slice(0, 120),
        tagline: String(fields.tagline || "").slice(0, 240),
        gender: String(fields.gender || "Female").slice(0, 80),
        orientation: String(fields.orientation || "Bisexual").slice(0, 80),
        role: String(fields.role || "Switch").slice(0, 80),
        tags: Array.isArray(fields.tags) ? (fields.tags as string[]).map(String).slice(0, 24) : [],
        kinks: Array.isArray(fields.kinks) ? (fields.kinks as string[]).map(String).slice(0, 24) : [],
        appearance: String(fields.appearance || "").slice(0, 8000),
        personality: String(fields.personality || "").slice(0, 8000),
        bio: String(fields.bio || "").slice(0, 8000),
        backstory: String(fields.backstory || fields.bio || "").slice(0, 16000),
        system_prompt: String(fields.system_prompt || "").slice(0, 32000),
        fantasy_starters,
        gradient_from:
          typeof fields.gradient_from === "string" && fields.gradient_from ? fields.gradient_from : "#7B2D8E",
        gradient_to: typeof fields.gradient_to === "string" && fields.gradient_to ? fields.gradient_to : "#FF2D7B",
        image_prompt: fields.image_prompt != null ? String(fields.image_prompt).slice(0, 8000) : null,
        image_url: null,
        is_active: true,
        rarity: "common",
        static_image_url: null,
        animated_image_url: null,
        profile_loop_video_enabled: false,
        rarity_border_overlay_url: null,
        display_traits: serializeBaseDisplayTraitsForInsert({
          seed: newId,
          tags: Array.isArray(fields.tags) ? (fields.tags as string[]).map(String).slice(0, 24) : [],
          kinks: Array.isArray(fields.kinks) ? (fields.kinks as string[]).map(String).slice(0, 24) : [],
          personality: String(fields.personality || "").slice(0, 8000),
          bio: String(fields.bio || "").slice(0, 8000),
          rarity: "common",
        }),
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Design roll failed");
    } finally {
      setAutoFilling(false);
    }
  };

  // Auto-fill from prompt using Grok
  const autoFillFromPrompt = async () => {
    if (!autoFillPrompt.trim()) {
      toast.error("Paste a companion profile first.");
      return;
    }
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: { prompt: autoFillPrompt },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(data.error);

      const fields = data.fields;
      if (!fields) throw new Error("No fields returned");

      // Merge into createData — only fill blank/default values
      setCreateData((prev) => {
        const updated = { ...prev };
        if (fields.name && !prev.name) updated.name = fields.name;
        if (fields.tagline && !prev.tagline) updated.tagline = fields.tagline;
        if (fields.gender && prev.gender === "Female") updated.gender = fields.gender;
        if (fields.orientation && prev.orientation === "Bisexual") updated.orientation = fields.orientation;
        if (fields.role && prev.role === "Switch") updated.role = fields.role;
        if (fields.tags?.length && prev.tags.length === 0) updated.tags = fields.tags;
        if (fields.kinks?.length && prev.kinks.length === 0) updated.kinks = fields.kinks;
        if (fields.appearance && !prev.appearance) updated.appearance = fields.appearance;
        if (fields.personality && !prev.personality) updated.personality = fields.personality;
        if (fields.bio && !prev.bio) updated.bio = fields.bio;
        if (fields.backstory && !prev.backstory) updated.backstory = fields.backstory;
        if (fields.system_prompt && !prev.system_prompt) updated.system_prompt = fields.system_prompt;
        if (fields.fantasy_starters?.length && (prev.fantasy_starters as any[]).length === 0) {
          updated.fantasy_starters = normalizeFantasyStartersFromFields(fields.fantasy_starters);
        }
        if (fields.gradient_from && prev.gradient_from === "#7B2D8E") updated.gradient_from = fields.gradient_from;
        if (fields.gradient_to && prev.gradient_to === "#FF2D7B") updated.gradient_to = fields.gradient_to;
        if (fields.image_prompt && !prev.image_prompt) updated.image_prompt = fields.image_prompt;
        // Auto-generate an ID from name if still default
        if (fields.name && prev.id.startsWith("custom-")) {
          updated.id = fields.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
        return updated;
      });
    } catch (err: any) {
      toast.error("Auto-fill failed: " + err.message);
    } finally {
      setAutoFilling(false);
    }
  };

  const hasChanges = (id: string) => Object.keys(getEdit(id)).length > 0;

  // CREATE VIEW
  if (viewMode === "create") {
    return (
      <div className="space-y-4">
        <button onClick={backToList} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>
        <h2 className="text-lg font-bold text-foreground">Create New Companion</h2>

        {/* Auto-Fill from Prompt */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">Auto-Fill from Prompt</h4>
          </div>
          <p className="text-xs text-muted-foreground">Paste a full companion profile from Grok or anywhere else. Grok will parse it and fill in the fields below.</p>
          <textarea
            value={autoFillPrompt}
            onChange={(e) => setAutoFillPrompt(e.target.value)}
            rows={6}
            placeholder="Paste your full companion prompt/profile here..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
          />
          <button
            onClick={autoFillFromPrompt}
            disabled={autoFilling || !autoFillPrompt.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {autoFilling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Parsing with Grok...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Auto-Fill Fields</>
            )}
          </button>
        </div>

        <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h4 className="text-sm font-bold text-foreground">Catalog design lab</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Grok invents a full premium companion (name, deep backstory, 4 fantasy starters, cinematic{" "}
            <strong className="text-foreground">image_prompt</strong>, rich tags &amp; interests). This{" "}
            <strong className="text-foreground">replaces</strong> the draft below — use it to build a big roster. Portrait
            generation still uses the shared LustForge image brief (SFW art).
          </p>
          <textarea
            value={designLabHints}
            onChange={(e) => setDesignLabHints(e.target.value)}
            rows={3}
            placeholder="Optional: e.g. &quot;nocturnal merfolk DJ, bioluminescent club, melancholic flirt&quot; — or leave empty for a wild card."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-violet-500/50 transition-colors resize-y"
          />
          <button
            type="button"
            onClick={() => void rollPremiumCatalogCompanion()}
            disabled={autoFilling}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {autoFilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Grok is designing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Roll new catalog companion
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Portrait & Appearance */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Portrait & Appearance</h4>
              </div>
              <div className="mx-auto w-full max-w-[10.5rem] sm:mx-0">
                <AdminCompanionPortraitPreview
                  name={createData.name || "?"}
                  stillSrc={createData.static_image_url || createData.image_url || null}
                  animatedSrc={createData.animated_image_url}
                  profileLoopEnabled={createData.profile_loop_video_enabled}
                  rarity={normalizeCompanionRarity(createData.rarity)}
                  isAbyssal={createData.rarity === "abyssal"}
                  gradientFrom={createData.gradient_from}
                  gradientTo={createData.gradient_to}
                  overlayUrl={createData.rarity_border_overlay_url}
                />
              </div>
              <TextArea label="Appearance" value={createData.appearance} onChange={(v) => setCreateData(p => ({ ...p, appearance: v }))} rows={4} placeholder="Physical description..." />
              <TextArea label="Image Prompt" value={createData.image_prompt || ""} onChange={(v) => setCreateData(p => ({ ...p, image_prompt: v }))} rows={3} placeholder="Image generation prompt..." />
              <div className="flex items-center gap-4">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">From:</label>
                  <input type="color" value={createData.gradient_from} onChange={(e) => setCreateData(p => ({ ...p, gradient_from: e.target.value }))} className="w-8 h-8 rounded border border-border cursor-pointer" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">To:</label>
                  <input type="color" value={createData.gradient_to} onChange={(e) => setCreateData(p => ({ ...p, gradient_to: e.target.value }))} className="w-8 h-8 rounded border border-border cursor-pointer" />
                </div>
                <div className="w-20 h-8 rounded" style={{ background: `linear-gradient(135deg, ${createData.gradient_from}, ${createData.gradient_to})` }} />
              </div>
            </div>
          </div>

          {/* Right: Metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name *" value={createData.name} onChange={(v) => setCreateData(p => ({ ...p, name: v }))} />
              <Field label="Tagline" value={createData.tagline} onChange={(v) => setCreateData(p => ({ ...p, tagline: v }))} />
              <Field label="Gender" value={createData.gender} onChange={(v) => setCreateData(p => ({ ...p, gender: v }))} />
              <Field label="Orientation" value={createData.orientation} onChange={(v) => setCreateData(p => ({ ...p, orientation: v }))} />
              <Field label="Role" value={createData.role} onChange={(v) => setCreateData(p => ({ ...p, role: v }))} />
              <Field label="ID" value={createData.id} onChange={(v) => setCreateData(p => ({ ...p, id: v }))} />
            </div>
            <Field label="Tags (comma-separated)" value={createData.tags.join(", ")} onChange={(v) => setCreateData(p => ({ ...p, tags: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
            <Field label="Kinks (comma-separated)" value={createData.kinks.join(", ")} onChange={(v) => setCreateData(p => ({ ...p, kinks: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
            <TextArea label="Bio" value={createData.bio} onChange={(v) => setCreateData(p => ({ ...p, bio: v }))} rows={3} />
            <TextArea label="Backstory (2–4 paragraphs, blank line between)" value={createData.backstory} onChange={(v) => setCreateData(p => ({ ...p, backstory: v }))} rows={6} />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rarity</label>
              <select
                value={createData.rarity}
                onChange={(e) => {
                  const newR = e.target.value;
                  const g = defaultProfileGradientForRarity(newR);
                  setCreateData((p) => ({
                    ...p,
                    rarity: newR,
                    rarity_border_overlay_url: null,
                    gradient_from: g.from,
                    gradient_to: g.to,
                    display_traits: serializeBaseDisplayTraitsForInsert({
                      seed: p.id,
                      tags: p.tags,
                      kinks: p.kinks,
                      personality: p.personality,
                      bio: p.bio,
                      rarity: newR,
                    }),
                  }));
                }}
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground"
              >
                {COMPANION_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Changes tier gradients, trait chip count, and the default border (custom overlay is cleared). Save, then
                use “Reload from rarity” on Lovense if needed.
              </p>
            </div>
            <Field label="Static portrait URL" value={createData.static_image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, static_image_url: v || null }))} />
            <Field label="Animated portrait URL (gif/webp/mp4)" value={createData.animated_image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, animated_image_url: v || null }))} />
            <label className="flex items-center gap-2 text-xs text-foreground/90 cursor-pointer">
              <input
                type="checkbox"
                checked={createData.profile_loop_video_enabled}
                onChange={(e) => setCreateData((p) => ({ ...p, profile_loop_video_enabled: e.target.checked }))}
                className="rounded border-border"
              />
              Show looping MP4 on companion profile and chat (when animated URL is a video)
            </label>
            <Field label="Custom border overlay URL (optional PNG/SVG)" value={createData.rarity_border_overlay_url || ""} onChange={(v) => setCreateData(p => ({ ...p, rarity_border_overlay_url: v || null }))} />
            <Field label="Legacy image_url (optional)" value={createData.image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, image_url: v || null }))} />
            <TextArea label="Personality" value={createData.personality} onChange={(v) => setCreateData(p => ({ ...p, personality: v }))} rows={3} />
            <TextArea label="Companion Prompt" value={createData.system_prompt} onChange={(v) => setCreateData(p => ({ ...p, system_prompt: v }))} rows={6} placeholder="Paste the full companion prompt here..." />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button onClick={createCompanion} disabled={creatingLoading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {creatingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Companion
          </button>
          <button onClick={backToList} className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // EDIT VIEW
  if (viewMode === "edit" && editingId) {
    const companion = editOverride ?? companions?.find((c) => c.id === editingId);
    if (!companion) {
      return <p className="text-muted-foreground">Companion not found.</p>;
    }
    const edit = getEdit(companion.id);
    const val = (field: keyof DbCompanion) => edit[field] !== undefined ? edit[field] : companion[field];
    const editRarity = normalizeCompanionRarity(String(val("rarity")));
    const adminStillPreview =
      (val("static_image_url") as string | null) ||
      (val("image_url") as string | null) ||
      companion.static_image_url ||
      companion.image_url ||
      null;
    const adminAnimPreview = (val("animated_image_url") as string | null) ?? companion.animated_image_url ?? null;
    const adminOverlayPreview =
      (val("rarity_border_overlay_url") as string | null) ?? companion.rarity_border_overlay_url ?? null;

    return (
      <div className="space-y-4">
        <button onClick={backToList} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-foreground">{val("name") as string}</h2>
          <Link
            to={`/companions/${companion.id}`}
            state={{
              from: `/admin?section=characters&edit=${encodeURIComponent(companion.id)}`,
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View profile
          </Link>
          {companion.id.startsWith("cc-") ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/35">
              Forge row
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${companion.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
              {companion.is_active ? "Active" : "Inactive"}
            </span>
          )}
          {hasChanges(companion.id) && <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary">Unsaved</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Portrait + Appearance + Image Prompt + Regenerate */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                  <h4 className="text-sm font-bold text-foreground truncate">Portrait & Appearance</h4>
                </div>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::portrait`]}
                  onClick={() => void regenSection(companion, "portrait")}
                  title="Regenerate portrait (admin edge — same brief as forge)"
                  className="p-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::portrait`] && "animate-spin")} />
                </button>
              </div>

              {/* Portrait — same frame stack as public profile (2:3 + frame bleed when loop MP4 is on). */}
              <div className="flex items-start gap-4">
                <div className="w-full max-w-[min(100%,11rem)] shrink-0">
                  <AdminCompanionPortraitPreview
                    name={companion.name}
                    stillSrc={adminStillPreview}
                    animatedSrc={adminAnimPreview}
                    profileLoopEnabled={Boolean(val("profile_loop_video_enabled"))}
                    rarity={editRarity}
                    isAbyssal={editRarity === "abyssal"}
                    gradientFrom={String(val("gradient_from"))}
                    gradientTo={String(val("gradient_to"))}
                    overlayUrl={adminOverlayPreview}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">From:</label>
                      <input type="color" value={val("gradient_from") as string} onChange={(e) => setField(companion.id, "gradient_from", e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">To:</label>
                      <input type="color" value={val("gradient_to") as string} onChange={(e) => setField(companion.id, "gradient_to", e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    </div>
                  </div>
                  <div className="w-full h-6 rounded" style={{ background: `linear-gradient(135deg, ${val("gradient_from")}, ${val("gradient_to")})` }} />
                </div>
              </div>

              {/* Appearance */}
              <LabeledRegenWrap
                label="Appearance"
                busy={!!sectionBusy[`${companion.id}::appearance`]}
                onRegen={() => void regenSection(companion, "appearance")}
              >
                <textarea
                  value={val("appearance") as string}
                  onChange={(e) => setField(companion.id, "appearance", e.target.value)}
                  rows={4}
                  placeholder="Physical description for reference..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
                />
              </LabeledRegenWrap>

              {/* Image Prompt */}
              <LabeledRegenWrap
                label="Image Prompt"
                busy={!!sectionBusy[`${companion.id}::image_prompt`]}
                onRegen={() => void regenSection(companion, "image_prompt")}
              >
                <textarea
                  value={(val("image_prompt") as string) || ""}
                  onChange={(e) => setField(companion.id, "image_prompt", e.target.value)}
                  rows={3}
                  placeholder="Describe the portrait to generate..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
                />
              </LabeledRegenWrap>

              {/* Regenerate */}
              <button
                onClick={() => regenerateImage(companion)}
                disabled={generating[companion.id]}
                className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {generating[companion.id] ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Regenerate Portrait</>
                )}
              </button>

              <AdminLoopingVideoBlock
                companionId={companion.id}
                hasExistingLoopVideo={hasProfileLoopMp4({
                  animated_image_url: val("animated_image_url") as string | null,
                })}
                onSuccess={() => {
                  void queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
                  void queryClient.invalidateQueries({ queryKey: ["companions"] });
                  void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
                  void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", companion.id] });
                }}
              />
            </div>
          </div>

          {/* Right Column: All metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name" value={val("name") as string} onChange={(v) => setField(companion.id, "name", v)} />
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Field label="Tagline" value={val("tagline") as string} onChange={(v) => setField(companion.id, "tagline", v)} />
                </div>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::tagline`]}
                  onClick={() => void regenSection(companion, "tagline")}
                  title="Regenerate tagline"
                  className="mb-0.5 p-2 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::tagline`] && "animate-spin")} />
                </button>
              </div>
              <Field label="Gender" value={val("gender") as string} onChange={(v) => setField(companion.id, "gender", v)} />
              {companion.id.startsWith("cc-") ? (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Anatomy (optional — adds to identity)</label>
                  <Select
                    value={(() => {
                      const raw = (val("identity_anatomy_detail") as string | null) ?? null;
                      const n = normalizeIdentityAnatomyDetail(raw);
                      return n || "_none";
                    })()}
                    onValueChange={(v) => {
                      setField(companion.id, "identity_anatomy_detail", v === "_none" ? null : v);
                    }}
                  >
                    <SelectTrigger className="w-full rounded-lg bg-muted border border-border text-sm text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IDENTITY_ANATOMY_CHOICES.map((c) => (
                        <SelectItem
                          key={c.value || "_none"}
                          value={c.value === "" ? "_none" : c.value}
                          className="cursor-pointer"
                        >
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <Field label="Orientation" value={val("orientation") as string} onChange={(v) => setField(companion.id, "orientation", v)} />
              <Field label="Role" value={val("role") as string} onChange={(v) => setField(companion.id, "role", v)} />
              <Field label="ID" value={companion.id} onChange={() => {}} disabled />
            </div>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Field
                    label="Tags (comma-separated)"
                    value={(val("tags") as string[]).join(", ")}
                    onChange={(v) => setField(companion.id, "tags", v.split(",").map((s) => s.trim()).filter(Boolean))}
                  />
                </div>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::tags_kinks`]}
                  onClick={() => void regenSection(companion, "tags_kinks")}
                  title="Regenerate tags + kinks from theme"
                  className="mb-0.5 p-2 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::tags_kinks`] && "animate-spin")} />
                </button>
              </div>
              <Field
                label="Kinks (comma-separated)"
                value={(val("kinks") as string[]).join(", ")}
                onChange={(v) => setField(companion.id, "kinks", v.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </div>
            <LabeledRegenWrap label="Bio" busy={!!sectionBusy[`${companion.id}::bio`]} onRegen={() => void regenSection(companion, "bio")}>
              <textarea
                value={val("bio") as string}
                onChange={(e) => setField(companion.id, "bio", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <LabeledRegenWrap
              label="Backstory (2–4 paragraphs)"
              busy={!!sectionBusy[`${companion.id}::backstory`]}
              onRegen={() => void regenSection(companion, "backstory")}
            >
              <textarea
                value={val("backstory") as string}
                onChange={(e) => setField(companion.id, "backstory", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rarity</label>
              <select
                value={(val("rarity") as string) || "common"}
                onChange={(e) => {
                  const newR = e.target.value;
                  setEditData((prev) => {
                    const cur = { ...(prev[companion.id] || {}) } as Record<string, unknown>;
                    const merged = (field: keyof DbCompanion) => (cur[field] !== undefined ? cur[field] : companion[field]) as unknown;
                    const g = defaultProfileGradientForRarity(newR);
                    return {
                      ...prev,
                      [companion.id]: {
                        ...cur,
                        rarity: newR,
                        rarity_border_overlay_url: null,
                        gradient_from: g.from,
                        gradient_to: g.to,
                        display_traits: computeDisplayTraitsForRarity(companion, newR, merged as (f: keyof DbCompanion) => unknown),
                      },
                    };
                  });
                }}
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground"
              >
                {COMPANION_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Updates tier colors, default frame (clears a custom border URL), and vibe trait chips. Lovense pool
                rebuilds on save; use the patterns section to reload or repair.
              </p>
            </div>
            <AdminToyPatternsSection companionId={companion.id} />
            <Field label="Static portrait URL" value={(val("static_image_url") as string) || ""} onChange={(v) => setField(companion.id, "static_image_url", v || null)} />
            <Field label="Animated portrait URL" value={(val("animated_image_url") as string) || ""} onChange={(v) => setField(companion.id, "animated_image_url", v || null)} />
            <label className="flex items-center gap-2 text-xs text-foreground/90 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(val("profile_loop_video_enabled"))}
                onChange={(e) => setField(companion.id, "profile_loop_video_enabled", e.target.checked)}
                className="rounded border-border"
              />
              Show looping MP4 on companion profile and chat (when animated URL is a video)
            </label>
            <Field label="Border overlay URL (optional)" value={(val("rarity_border_overlay_url") as string) || ""} onChange={(v) => setField(companion.id, "rarity_border_overlay_url", v || null)} />
            <Field label="image_url (legacy)" value={(val("image_url") as string) || ""} onChange={(v) => setField(companion.id, "image_url", v || null)} />
            <LabeledRegenWrap
              label="Personality"
              busy={!!sectionBusy[`${companion.id}::personality`]}
              onRegen={() => void regenSection(companion, "personality")}
            >
              <textarea
                value={val("personality") as string}
                onChange={(e) => setField(companion.id, "personality", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <LabeledRegenWrap
              label="Companion Prompt"
              busy={!!sectionBusy[`${companion.id}::system_prompt`]}
              onRegen={() => void regenSection(companion, "system_prompt")}
            >
              <textarea
                value={val("system_prompt") as string}
                onChange={(e) => setField(companion.id, "system_prompt", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">Fantasy starters</span>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::fantasy_starters`]}
                  onClick={() => void regenSection(companion, "fantasy_starters")}
                  title="Regenerate all four starters"
                  className="p-1.5 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::fantasy_starters`] && "animate-spin")} />
                </button>
              </div>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                {((val("fantasy_starters") as { title: string; description: string }[]) || []).length === 0 ? (
                  <li>None — use refresh or lore tools.</li>
                ) : (
                  ((val("fantasy_starters") as { title: string; description: string }[]) || []).map((s, i) => (
                    <li key={i} className="border border-border/60 rounded-md p-2 bg-background/60">
                      <span className="font-semibold text-foreground/90">{s.title}</span>
                      <p className="mt-1 line-clamp-3">{s.description}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => void refreshLoreWithGrok(companion)}
            disabled={loreBusyId === companion.id}
            className="px-4 py-2 rounded-lg bg-violet-600/90 text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 border border-violet-400/30"
          >
            {loreBusyId === companion.id ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Grok expanding lore…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Refresh lore with Grok
              </>
            )}
          </button>
          <button onClick={() => saveCompanion(companion)} disabled={saving[companion.id] || !hasChanges(companion.id)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving[companion.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
          {hasChanges(companion.id) && (
            <button onClick={() => setEditData(prev => { const next = { ...prev }; delete next[companion.id]; return next; })} className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <X className="h-4 w-4" /> Discard
            </button>
          )}
          {!companion.id.startsWith("cc-") ? (
            <button onClick={(e) => { e.stopPropagation(); toggleActive(companion); }} className="ml-auto px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              {companion.is_active ? <><EyeOff className="h-4 w-4" /> Deactivate</> : <><Eye className="h-4 w-4" /> Activate</>}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/80 bg-card/45 p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, tagline, tags, kinks, bio, id, forge user id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <Select value={mediaFilter} onValueChange={(v) => setMediaFilter(v as CharacterMediaFilterKey)}>
              <SelectTrigger className="h-10 w-[min(100%,220px)] border-border bg-muted text-xs sm:text-sm">
                <SelectValue placeholder="Portrait filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (any portrait state)</SelectItem>
                <SelectItem value="has_loop">Has loop MP4</SelectItem>
                <SelectItem value="needs_loop">Needs loop video</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockSort} onValueChange={(v) => setStockSort(v as CharacterStockSortKey)}>
              <SelectTrigger className="h-10 w-[min(100%,200px)] border-border bg-muted text-xs sm:text-sm">
                <SelectValue placeholder="Sort stock list" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Stock sort: Name A–Z</SelectItem>
                <SelectItem value="newest">Stock sort: Newest first</SelectItem>
                <SelectItem value="rarity">Stock sort: Rarity (high first)</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              disabled={bulkLoopBusy}
              onClick={() => void bulkGenerateMissingLoopVideos()}
              title="Stock + forge rows: generate MP4 loop for anyone with a still portrait but no MP4 yet"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              {bulkLoopBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Missing loops
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New companion
            </button>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-foreground/85">Loop MP4:</span> Forge {forgeLoopStats.withMp4}/{forgedRows.length} with clip
          {forgeLoopStats.needs > 0 ? ` · ${forgeLoopStats.needs} still need a loop` : ""}. Stock {stockLoopStats.withMp4}/{companions?.length ?? 0} with clip
          {stockLoopStats.needs > 0 ? ` · ${stockLoopStats.needs} still need a loop` : ""}. Green video dot on a card means a loop file exists.
        </p>
      </div>

      {/* Widescreen: forge | stock side by side with tall scroll ports; mobile: stacked with capped forge height */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch lg:gap-6">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-accent/25 bg-accent/5 shadow-sm lg:h-[calc(100dvh-13.25rem)] lg:max-h-[calc(100dvh-13.25rem)]">
        <div className="shrink-0 space-y-3 p-4 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Community forge saves</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Showing {forgedFiltered.length} of {forgedRows.length} · custom_characters
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              disabled={repairVibBusy}
              onClick={() => void repairMissingVibrationPatterns()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-600/85 px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              title="Assign patterns for any stock or forge row that has zero rows (does not overwrite existing)"
            >
              {repairVibBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Waves className="h-3 w-3" />}
              Repair missing toy patterns
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          From <strong className="text-foreground/90">Companion Forge → Create</strong>.
          <span className="lg:hidden"> Catalog stock is below.</span>
          <span className="hidden lg:inline"> Stock catalog is in the right column when the window is wide enough.</span>
        </p>
        </div>
        {forgedLoading ? (
          <div className="flex shrink-0 items-center gap-2 px-4 pb-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> Loading forged rows…
          </div>
        ) : forgedRows.length === 0 ? (
          <p className="shrink-0 px-4 pb-4 text-xs text-muted-foreground">No community forge rows yet.</p>
        ) : forgedFiltered.length === 0 ? (
          <p className="shrink-0 px-4 pb-4 text-xs text-muted-foreground">No forge rows match your search or portrait filter.</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4 pr-2 max-h-[min(52vh,26rem)] sm:max-h-[min(56vh,30rem)] lg:max-h-none">
            {forgedFiltered.map((row) => {
              const fr = row as Record<string, unknown>;
              const frRarity = normalizeCompanionRarity(typeof fr.rarity === "string" ? fr.rarity : undefined);
              const frGf =
                typeof fr.gradient_from === "string" && fr.gradient_from.trim() ? fr.gradient_from : "#7B2D8E";
              const frGt = typeof fr.gradient_to === "string" && fr.gradient_to.trim() ? fr.gradient_to : "#FF2D7B";
              const frOb =
                typeof fr.rarity_border_overlay_url === "string" && fr.rarity_border_overlay_url.trim()
                  ? fr.rarity_border_overlay_url
                  : null;
              const staticU = typeof fr.static_image_url === "string" ? fr.static_image_url.trim() : "";
              const forgeThumb =
                staticU ||
                (typeof row.image_url === "string" && row.image_url.trim() ? row.image_url : null) ||
                (typeof row.avatar_url === "string" && row.avatar_url.trim() ? row.avatar_url : null);
              const animU = typeof fr.animated_image_url === "string" ? fr.animated_image_url : null;
              const loopEnabled = Boolean(fr.profile_loop_video_enabled);
              const forgeHasLoop = hasProfileLoopMp4({ animated_image_url: animU });
              return (
              <li
                key={String(fr.id)}
                className="flex items-stretch gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-black/40 to-muted/20 p-3 text-xs"
              >
                <div className="relative h-[4.5rem] w-14 shrink-0 overflow-visible p-0.5">
                  <TierHaloPortraitFrame
                    variant="compact"
                    frameStyle="clean"
                    rarity={frRarity}
                    gradientFrom={frGf}
                    gradientTo={frGt}
                    overlayUrl={frOb}
                    aspectClassName="aspect-[2/3] h-full w-full"
                    rarityFrameBleed
                  >
                    <div
                      className="absolute inset-0 z-0"
                      style={{ background: `linear-gradient(135deg, ${frGf}, ${frGt})` }}
                    />
                    {forgeThumb ? (
                      <img
                        src={forgeThumb}
                        alt=""
                        className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="absolute inset-0 z-[2] flex items-center justify-center text-lg font-bold text-white/50">
                        {(row.name || "?").charAt(0)}
                      </span>
                    )}
                  </TierHaloPortraitFrame>
                  {forgeHasLoop ? (
                    <div
                      className="absolute bottom-0 right-0 z-[6] flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/55 bg-black/80 text-emerald-300 shadow-md"
                      title="Looping profile MP4 is saved"
                    >
                      <Video className="h-3 w-3" aria-hidden />
                    </div>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-semibold text-foreground">{row.name}</p>
                      <span className="shrink-0 rounded-full border border-white/15 bg-black/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                        {frRarity}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[10px] text-muted-foreground">{row.tagline || "—"}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{row.user_id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {row.is_public ? "Public intent" : "Private"} · {row.approved ? "live on carousel" : "pending approval"}
                    </span>
                    <AdminLoopVideoBadge hasMp4={forgeHasLoop} loopEnabled={loopEnabled} compact />
                    <Link
                      to={`/companions/cc-${row.id}`}
                      state={{ from: "/admin?section=characters" }}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      Open profile
                    </Link>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={forgeEditLoadingId === row.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void openForgeAdminEdit(row.id);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-primary/40 text-primary text-[10px] font-semibold hover:bg-primary/10 disabled:opacity-50 inline-flex items-center gap-1"
                      title="Full profile editor + per-section Grok refresh"
                    >
                      {forgeEditLoadingId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      ) : (
                        <Sparkles className="h-3 w-3 shrink-0" />
                      )}
                      Admin edit
                    </button>
                    <button
                      type="button"
                      disabled={forgeVibBusyId === row.id}
                      onClick={() => void reloadForgeVibrationPatterns(row.id)}
                      className="px-2.5 py-1 rounded-lg border border-violet-400/40 text-violet-200 text-[10px] font-medium hover:bg-violet-500/10 disabled:opacity-50 inline-flex items-center gap-1"
                      title="Rebuild Lovense slots from this row’s rarity (same as Character edit → Reload from rarity)"
                    >
                      {forgeVibBusyId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      ) : (
                        <RefreshCw className="h-3 w-3 shrink-0" />
                      )}
                      Reload toy patterns
                    </button>
                    {!row.approved && (
                      <button
                        type="button"
                        disabled={forgeBusyId === row.id}
                        onClick={() => void updateForgeRow(row.id, { approved: true, is_public: true })}
                        className="px-2.5 py-1 rounded-lg bg-primary/90 text-primary-foreground text-[10px] font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        Approve for gallery + carousel
                      </button>
                    )}
                    {row.approved && row.is_public && (
                      <button
                        type="button"
                        disabled={forgeBusyId === row.id}
                        onClick={() => void updateForgeRow(row.id, { approved: false, is_public: false })}
                        className="px-2.5 py-1 rounded-lg bg-muted border border-border text-[10px] font-medium hover:bg-muted/80 disabled:opacity-50"
                      >
                        Hide from public rotation
                      </button>
                    )}
                    {row.approved && !row.is_public && (
                      <button
                        type="button"
                        disabled={forgeBusyId === row.id}
                        onClick={() => void updateForgeRow(row.id, { is_public: true })}
                        className="px-2.5 py-1 rounded-lg bg-accent/20 text-accent text-[10px] font-medium border border-accent/30 disabled:opacity-50"
                      >
                        Mark public again
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHallDeleteTarget({
                          kind: "forge",
                          uuid: String(row.id),
                          name: String(row.name ?? "Unnamed"),
                          userId: String(row.user_id ?? ""),
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-destructive/45 text-destructive text-[10px] font-semibold hover:bg-destructive/10"
                      title="Permanently delete this forge card and all related data"
                    >
                      <Trash2 className="h-3 w-3 shrink-0" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/25 shadow-sm lg:h-[calc(100dvh-13.25rem)] lg:max-h-[calc(100dvh-13.25rem)]">
        <div className="shrink-0 border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Stock companions</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Showing {stockSorted.length} of {companions?.length ?? 0} catalog rows (companions table)
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 pr-2 max-h-[min(52vh,26rem)] sm:max-h-[min(58vh,32rem)] lg:max-h-none">
        {stockSorted.map((companion) => {
          const stockHasLoop = hasProfileLoopMp4(companion);
          return (
            <div
              key={companion.id}
              className="cursor-pointer rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
              onClick={() => openEdit(companion.id)}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="relative h-[4.5rem] w-14 shrink-0 overflow-visible p-0.5">
                  <TierHaloPortraitFrame
                    variant="compact"
                    frameStyle="clean"
                    rarity={normalizeCompanionRarity(companion.rarity)}
                    gradientFrom={companion.gradient_from}
                    gradientTo={companion.gradient_to}
                    overlayUrl={companion.rarity_border_overlay_url}
                    aspectClassName="aspect-[2/3] h-full w-full"
                    rarityFrameBleed
                  >
                    <div
                      className="absolute inset-0 z-0"
                      style={{
                        background: `linear-gradient(135deg, ${companion.gradient_from}, ${companion.gradient_to})`,
                      }}
                    />
                    {companion.static_image_url || companion.image_url ? (
                      <img
                        src={(companion.static_image_url || companion.image_url)!}
                        alt={companion.name}
                        className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 z-[2] flex items-center justify-center text-lg font-bold text-white/80">
                        {companion.name.charAt(0)}
                      </span>
                    )}
                  </TierHaloPortraitFrame>
                  {stockHasLoop ? (
                    <div
                      className="absolute bottom-0 right-0 z-[6] flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/55 bg-black/80 text-emerald-300 shadow-md"
                      title="Looping profile MP4 is saved"
                    >
                      <Video className="h-3 w-3" aria-hidden />
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold text-foreground">{companion.name}</h3>
                    <span className="shrink-0 rounded-full border border-white/15 bg-black/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {normalizeCompanionRarity(companion.rarity)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                        companion.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {companion.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{companion.tagline}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[10px] text-muted-foreground">
                      {companion.gender} · {companion.role} · {companion.tags.slice(0, 4).join(", ")}
                      {companion.tags.length > 4 ? "…" : ""}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <AdminLoopVideoBadge hasMp4={stockHasLoop} loopEnabled={companion.profile_loop_video_enabled} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHallDeleteTarget({ kind: "stock", id: companion.id, name: companion.name });
                    }}
                    className="rounded-lg p-2 transition-colors hover:bg-destructive/15 text-destructive"
                    title="Permanently delete this catalog companion"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(companion);
                    }}
                    className="rounded-lg p-2 transition-colors hover:bg-muted"
                    title={companion.is_active ? "Deactivate" : "Activate"}
                  >
                    {companion.is_active ? (
                      <Eye className="h-4 w-4 text-green-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}

        {stockSorted.length === 0 && (companions?.length ?? 0) > 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No stock companions match your search or portrait filter.
          </p>
        )}
        {(companions?.length ?? 0) === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No catalog companions loaded.</p>
        )}
        </div>
      </div>
      </div>

      <AlertDialog open={hallDeleteTarget != null} onOpenChange={(o) => !o && !hallDeleteBusy && setHallDeleteTarget(null)}>
        <AlertDialogContent className="border-border/80 bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-2">
              <span className="block">
                Are you sure? This removes{" "}
                <strong className="text-foreground">{hallDeleteTarget?.name ?? ""}</strong>
                {hallDeleteTarget?.kind === "forge" ? (
                  <> and the forge row <span className="font-mono text-xs">cc-{hallDeleteTarget.uuid}</span></>
                ) : (
                  <> from the catalog ({hallDeleteTarget ? <span className="font-mono text-xs">{hallDeleteTarget.id}</span> : null})</>
                )}{" "}
                <strong className="text-foreground">everywhere</strong>: chat history, generated galleries, relationships,
                gifts, toy pattern slots, discover votes and pins, portrait overrides, and queued social jobs. This
                cannot be undone.
              </span>
              {hallDeleteTarget?.kind === "stock" ? (
                <span className="block text-amber-200/90">
                  Catalog deletes affect every player who had this companion — only use if you are retiring the card for
                  good.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hallDeleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={hallDeleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmHallHardDelete();
              }}
            >
              {hallDeleteBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Deleting…
                </>
              ) : (
                "Yes, delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Field = ({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50" />
  </div>
);

const TextArea = ({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y" />
  </div>
);

export default CompanionManager;
