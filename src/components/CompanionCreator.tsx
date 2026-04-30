import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  Coins,
  Dices,
  Gem,
  Loader2,
  ScanEye,
  Maximize2,
  Sparkles,
  Wand2,
  ImageIcon,
  Check,
  Globe,
  Lock,
  Trash2,
  Upload,
  Archive,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { clearForgeStash, loadForgeStash, saveForgeStash, type ForgeStashPayload } from "@/lib/forgeDraftStash";
import { buildLocalSpinForgeFields } from "@/lib/forgeLocalSpinContent";
import { clearForgeSessionDraft, loadForgeSessionDraft, saveForgeSessionDraft } from "@/lib/forgeSessionDraft";
import { invokeGenerateImage } from "@/lib/invokeGenerateImage";
import { invokeGenerateLiveCallOptions } from "@/lib/invokeGenerateLiveCallOptions";
import { formatSupabaseError } from "@/lib/supabaseError";
import { fallbackForgeDisplayName } from "@/lib/forgeRandomName";
import { pickOne, pickRandom, randomTraitCount } from "@/lib/forgeRandomSeeds";
import { fetchForgeNameExclusions, generateForgeName, generateUniqueForgeName, normalizeNameKey } from "@/lib/forgeNameEngine";
import {
  DEFAULT_FORGE_PERSONALITY,
  type ForgePersonalityKey,
  type ForgePersonalityProfile,
  FORGE_PERSONALITY_BY_KEY,
  forgePersonalityLabel,
  forgePersonalitySeedsProse,
  forgePersonalityToArchetypeList,
  inferForgePersonalityFromText,
  randomForgePersonality,
} from "@/lib/forgePersonalityProfile";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/config/auth";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { AdminLoopingVideoBlock } from "@/components/admin/AdminLoopingVideoBlock";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";
import {
  COMPANION_RARITIES,
  type CompanionRarity,
  normalizeCompanionRarity,
} from "@/lib/companionRarity";
import { generateTcgStatBlock } from "@/lib/tcgStats";
import {
  FORGE_BODY_GROUPS,
  FORGE_BODY_TYPES,
  forgeBodyCategoryIdForType,
  forgeCompactStatureInstruction,
  isCompactStatureForgeBodyType,
  normalizeForgeBodyType,
} from "@/lib/forgeBodyTypes";
import {
  ALL_FORGE_ETHNICITY_OPTIONS,
  ethnicityForImagePipeline,
  FORGE_ETHNICITY_ANY_LABEL,
  FORGE_ETHNICITY_GROUPS,
  isOpenEthnicityChoice,
  normalizeForgeEthnicity,
} from "@/lib/forgeEthnicities";
import {
  FORGE_ART_STYLES,
  FORGE_SCENE_ATMOSPHERES,
  FORGE_SCENE_GROUPS,
  composeForgePortraitPrompt,
  normalizeForgeArtStyle,
  normalizeForgeScene,
} from "@/lib/forgePortraitPrompt";
import {
  type IdentityAnatomyDetail,
  IDENTITY_ANATOMY_CHOICES,
  identityAnatomyForSystemOneLiner,
  labelIdentityAnatomyForTags,
  normalizeIdentityAnatomyDetail,
} from "@/lib/identityAnatomyDetail";
import { FORGE_CREATE_COMPANION_FC, FORGE_PREVIEW_FC } from "@/lib/forgeEconomy";
import { creditForgeCoins, spendForgeCoins } from "@/lib/forgeCoinsClient";
import { serializeBaseDisplayTraitsForInsert } from "@/lib/vibeDisplayTraits";
import {
  DEFAULT_FORGE_VISUAL_TAILORING,
  FORGE_ACCESSORIES,
  FORGE_ASS_SIZES,
  FORGE_BREAST_SIZES,
  FORGE_COLOR_PALETTES,
  FORGE_EYE_COLORS,
  FORGE_FOOTWEAR,
  FORGE_HAIR_COLORS,
  FORGE_HAIR_STYLES,
  FORGE_HEIGHTS,
  FORGE_OUTFIT_STYLES,
  FORGE_SKIN_TONES,
  FORGE_SPECIAL_FEATURES,
  deriveSmartOutfitTheme,
  forgeVisualTailoringSeedsProse,
  forgeVisualPortraitAddon,
  normalizeForgeVisualTailoring,
  randomForgeVisualTailoring,
  type ForgeVisualTailoring,
} from "@/lib/forgeVisualTailoring";
import { buildForgeThemeSnapshotV1 } from "@/lib/forgeThemeSnapshot";
import {
  randomizeAllTabSharedOverrides,
  randomizeAllTabsFeatureMaps,
  randomizeForgeTabSharedOverrides,
  rollForgeRenderingChaosWildcard,
  rollForgeRenderingForTab,
} from "@/lib/forgeThemeDeepRandomize";
import {
  FORGE_CARD_POSE_UI,
  FORGE_TAB_RENDER_PRESETS,
  FORGE_THEME_TABS,
  type ForgeCardPoseId,
  type ForgeTabFeatureMap,
  type ForgeTabSharedOverride,
  type ForgeThemeTabId,
  buildForgeTabPromptAddon,
  forgeCardPoseProse,
  forgeTabLiveSummary,
  makeDefaultTabFeatures,
  makeDefaultTabSharedOverrides,
  normalizeForgeCardPoseId,
  normalizeForgeTabFeatureMap,
  normalizeForgeTabSharedOverrides,
  normalizeForgeThemeTabId,
  randomizeForgeTabFeatures,
  randomForgeCardPose,
} from "@/lib/forgeThemeTabs";
import { ForgeThemeControls } from "@/components/forge/ForgeThemeControls";

const NEON = "#FF2D7B";
const PREVIEW_COST = FORGE_PREVIEW_FC;
const FINAL_COST_PER = FORGE_CREATE_COMPANION_FC;

const FORGE_TAB_BUTTON_ACCENT: Record<ForgeThemeTabId, string> = {
  anime: "border-fuchsia-400/45 bg-gradient-to-br from-fuchsia-950/55 via-black/40 to-black/30 shadow-[0_0_20px_rgba(232,121,249,0.12)]",
  monster: "border-emerald-400/40 bg-gradient-to-br from-emerald-950/45 to-black/35 shadow-[0_0_18px_rgba(52,211,153,0.1)]",
  gothic: "border-violet-400/45 bg-gradient-to-br from-violet-950/50 to-black/35",
  realistic: "border-amber-400/38 bg-gradient-to-br from-amber-950/35 to-black/35",
  dark_fantasy: "border-indigo-400/45 bg-gradient-to-br from-indigo-950/50 to-black/40",
  chaos: "border-[#FF2D7B]/55 bg-gradient-to-br from-[#FF2D7B]/22 via-purple-950/35 to-black/35 shadow-[0_0_22px_rgba(255,45,123,0.18)]",
};

export type CompanionCreatorMode = "user" | "admin";

export interface CompanionCreatorProps {
  mode?: CompanionCreatorMode;
  embedded?: boolean;
  /** Admin: called after a successful forge so parent can switch tabs (e.g. Character management). */
  onForged?: () => void;
}

/** Imperative admin hooks (embedded forge + scheduled panel). */
export type CompanionCreatorHandle = {
  runRandomRouletteAndForge: (opts?: { forcePrivate?: boolean }) => Promise<void>;
  /** Celebrity / character parody — fills forge fields from Grok (same as Parody lab apply). */
  runCelebrityParody: (celebritySeed: string, opts?: { grotesqueGpk?: boolean }) => Promise<void>;
};

const GENDERS = [
  "Female",
  "Male",
  "Trans Woman",
  "Trans Man",
  "Non-Binary",
  "Enby",
  "Genderfluid",
  "Agender",
  "Demigirl",
  "Demiboy",
  "Furry",
  "Femboy",
  "Butch",
  "Stud",
  "Intersex",
  "Alien / Otherworldly",
] as const;

const TRAITS = [
  "Tattoos",
  "Horns",
  "Glowing eyes",
  "Wings",
  "Fangs",
  "Piercings",
  "Cybernetic implants",
  "Animal ears",
  "Tail",
  "Scars (aesthetic)",
  "Heterochromia",
  "Freckles",
  "Vitiligo",
  "Body glitter",
  "Latex / PVC accent",
  "Collar & leash aesthetic",
  "Third eye motif",
  "Bioluminescent markings",
  "Runic markings",
  "Mechanical halo",
  "Crystalline growths",
  "Living shadow aura",
  "Golden skin cracks",
  "Floral vine tattoos",
  "Celestial freckles",
  "Elemental glow veins",
] as const;

const SPECIAL_FEATURE_SET = new Set<string>(FORGE_SPECIAL_FEATURES as readonly string[]);
const TRAIT_SET = new Set<string>(TRAITS as readonly string[]);
const APPEARANCE_ACCENT_OPTIONS = Array.from(new Set<string>([...FORGE_SPECIAL_FEATURES, ...TRAITS]));

const ORIENTATIONS = [
  "Pansexual",
  "Bisexual",
  "Gay",
  "Lesbian",
  "Straight",
  "Asexual",
  "Demisexual",
  "Queer",
  "Questioning",
] as const;

const BATCH_PRESETS = [1, 3, 5, 10] as const;

const PREVIEW_STORAGE_PREFIX = "lustforge_forge_preview_v1";
const GROK_PACKSHOT_SOFT_LIMIT = 3200;

function clampForgePrompt(input: string, maxChars = GROK_PACKSHOT_SOFT_LIMIT): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length <= maxChars ? clean : `${clean.slice(0, maxChars).trimEnd()}…`;
}

function previewStorageKey(userId: string, forgeMode: CompanionCreatorMode) {
  return `${PREVIEW_STORAGE_PREFIX}_${forgeMode}_${userId}`;
}

/** Samples a small bitmap for coarse dominant colors — steers generation without sending raw image bytes. */
async function extractPaletteMoodFromImageFile(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const w = 48;
  const h = 48;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    throw new Error("No canvas context");
  }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const { data } = ctx.getImageData(0, 0, w, h);
  const bins = new Map<string, number>();
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${Math.floor(r / 40) * 40},${Math.floor(g / 40) * 40},${Math.floor(b / 40) * 40}`;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  const top = [...bins.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => {
      const [r, g, b] = k.split(",").map(Number);
      return `rgb(${r},${g},${b})`;
    });
  return `Abstract palette from reference thumbnail: ${top.join(", ")}. Echo lighting warmth and color relationships only; invent a wholly original fictional face and body.`;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function ForgeFieldDice({
  onRoll,
  title = "Randomize",
}: {
  onRoll: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRoll}
      title={title}
      className="shrink-0 rounded-lg border border-white/12 bg-black/40 p-1.5 sm:p-2 text-[hsl(170_100%_70%)] hover:border-[hsl(170_100%_42%)]/45 hover:bg-white/[0.04] transition-colors active:scale-[0.97]"
    >
      <Dices className="h-3.5 w-3.5" />
    </button>
  );
}

function normalizeFantasyStartersFromFields(raw: unknown): { title: string; description: string }[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[])
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const description = String(s.description ?? s.message ?? "").trim();
      const title =
        String(s.title ?? s.label ?? "").trim() ||
        (description ? `${description.slice(0, 44)}${description.length > 44 ? "…" : ""}` : "");
      if (!title || !description) return null;
      return { title, description };
    })
    .filter((x): x is { title: string; description: string } => x !== null);
}

/** If a profile parse returns fewer than 4, pad with in-character openers so chat UI always has buttons. */
function padFantasyStartersToFour(
  starters: { title: string; description: string }[],
  displayName: string,
): { title: string; description: string }[] {
  const out = starters.filter((s) => s.title.trim() && s.description.trim()).slice(0, 4);
  const fill: { title: string; description: string }[] = [
    {
      title: "Dangerous proximity",
      description: `I've been counting your breaths from across the room. ${displayName} — say why you came before I invent a reason for you.`,
    },
    {
      title: "Midnight honesty",
      description: `Don't look away. If we're doing this, we're doing it with teeth. (${displayName})`,
    },
    {
      title: "Soft opening",
      description: `Okay. One drink's worth of courage—you first. I'm ${displayName}, and I'm already too curious.`,
    },
    {
      title: "Pressure point",
      description: `You're already flustered. Good. ${displayName} wants the real version, not the polite one.`,
    },
  ];
  let i = 0;
  while (out.length < 4 && i < fill.length) {
    out.push(fill[i]!);
    i++;
  }
  return out;
}

/** Minimum chronicle length before we auto-run design-lab to avoid saving one-line stubs. */
const MIN_CHRONICLE_CHARS = 500;

function buildForgeDesignLabSeedPrompt(o: {
  gender: string;
  ethnicity: string;
  forgePersonality: ForgePersonalityProfile;
  artStyle: string;
  sceneAtmosphere: string;
  bodyType: string;
  orientation: string;
  traits: string[];
  visualTailoring?: ForgeVisualTailoring;
  /** If set, model must use this display name (from forge name engine or user-typed). */
  mandatoryDisplayName?: string;
}): string {
  const nameLine = o.mandatoryDisplayName?.trim()
    ? `- **MANDATORY display name (use this EXACT string in the "name" field, bio, backstory, starters, system prompt — the character's one true name):** ${o.mandatoryDisplayName.trim()}`
    : "";
  const nameRule1 = o.mandatoryDisplayName?.trim()
    ? `1) name: MUST be exactly: "${o.mandatoryDisplayName.trim()}" — the forge already locked a culturally-appropriate name from the Personalities matrix. Do not substitute a gothic, cyberpunk, or stock-romance alias.`
    : `1) name: Match the Personalities matrix (time period + all five picks). Avoid recycled dark-romance catalog names ("Velvet / Storm / Night / Vale") unless Dark Fantasy. NEVER Forge-*, Temp-*, UUIDs. **One true name** in backstory, bio, fantasy_starters, and system_prompt.`;
  return `FORGE — treat the lines below as creative SEEDS only. Interpret into a cohesive original character. Do NOT paste the seed list into "appearance" or "backstory".

Seeds:
${nameLine}
- gender leaning (${o.gender}): informs **face, voice, and personality presentation only** — **physique, species, scale, and silhouette come only from** body type "${o.bodyType}"; do not let gender imply a different default human build.
- ancestry / complexion (${o.ethnicity}): ${isOpenEthnicityChoice(o.ethnicity) ? "operator left open — invent a coherent face, skin tone, and hair that still obey body type + species + art style." : `treat as a **visual lock** for skin tone, facial cues, and hair texture (fantasy labels = literal where compatible); must not erase or contradict body type "${o.bodyType}".`}
- **Personalities (fuse ALL into one voice — this block is the psychological + speech contract):**
${forgePersonalitySeedsProse(o.forgePersonality)
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
- art style: ${o.artStyle}
- scene anchor: ${o.sceneAtmosphere}
- body type: ${o.bodyType}
- orientation: ${o.orientation}
- notable traits: ${o.traits.length ? o.traits.join(", ") : "(none)"}
${
  o.visualTailoring
    ? `\n- **Appearance & outfit lab (must propagate into appearance prose, wardrobe, and image_prompt — stay SFW):**\n${forgeVisualTailoringSeedsProse(o.visualTailoring, o.forgePersonality)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}`
    : ""
}

Hard requirements:
${forgeCompactStatureInstruction(o.bodyType)}${nameRule1}
2) appearance: minimum three sentences of lush cinematic prose — no comma-only trait dumps. Forge body type "${o.bodyType}" is the **spine of the physique** — lead with how this body occupies space (limb/torso/head proportions, scale vs furniture or environment). Personality, species, and wardrobe **theme around** that body; never treat it as a footnote. If "${o.bodyType}" is a compact / short-stature / little-person / pixie / micro label, nothing in the prose may read like a default average-height unnamed human — establish adult compact proportions first, then layer everything else.
3) backstory: 3–4 paragraphs of premium dark-romance storytelling that weaves every Personalities line into one coherent history — not a bullet recap of tags.
4) bio: 1–2 short hook paragraphs, different opening beat than backstory.
5) fantasy_starters: exactly four; each description is the user's first in-character chat message (1–4 sentences). Bold NSFW when persona fits; never end with meta questions ("Are you ready?", "Want to start?") — close on dialogue or action.
6) tags: 8–12 items mixing species (if any), aesthetic, era, hobbies — not identical to the appearance paragraph.
7) image_prompt: one dense SFW paragraph for a vertical 2:3 portrait card. **The first tokens must be exactly this pattern:** \`A character, …\` followed by an explicit physique line that locks "${o.bodyType}" for silhouette/species/scale/material — never vague. Do NOT default to a normal human model with small accessories. For non-human or hybrid labels, describe visible anatomy (fur, tail, digitigrade legs, extra limbs, slime mass, pixel grid, etc.) prominently. Gender must not override body shape. Then art style "${o.artStyle}" and scene "${o.sceneAtmosphere}" (lighting, wardrobe, set) — scene must not erase the body type. If the scene is transparent / empty-set ("No Background", "No Background / Transparent"), use cyclorama, flat color, or clearly cut-out portrait only — no busy environment unless the body type requires scale props.
8) system_prompt: full chat charter for this persona.`;
}

const CompanionCreator = forwardRef<CompanionCreatorHandle, CompanionCreatorProps>(function CompanionCreator(
  { mode = "user", embedded = false, onForged },
  ref,
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = mode === "admin";

  const [userId, setUserId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [name, setName] = useState("");
  const [namePrefix, setNamePrefix] = useState("");
  const [tagline, setTagline] = useState("");
  const [gender, setGender] = useState<string>(() => pickOne(GENDERS));
  /** Optional: pre_op / post_op / futa — combined with any identity. */
  const [identityAnatomyDetail, setIdentityAnatomyDetail] = useState<IdentityAnatomyDetail>("");
  const [forgePersonality, setForgePersonality] = useState<ForgePersonalityProfile>(() => randomForgePersonality());
  const [visualTailoring, setVisualTailoring] = useState<ForgeVisualTailoring>(() => ({ ...DEFAULT_FORGE_VISUAL_TAILORING }));
  const [profileLoopJob, setProfileLoopJob] = useState<"idle" | "queued" | "running" | "done" | "error">("idle");
  const [artStyle, setArtStyle] = useState<string>(() => "Photorealistic");
  const [sceneAtmosphere, setSceneAtmosphere] = useState<string>(() =>
    normalizeForgeScene("No Background / Transparent"),
  );
  const [bodyType, setBodyType] = useState<string>(() => normalizeForgeBodyType(pickOne(FORGE_BODY_TYPES)));
  const [traits, setTraits] = useState<string[]>(() => pickRandom(TRAITS, randomTraitCount()));
  const [orientation, setOrientation] = useState<string>(() => pickOne(ORIENTATIONS));
  const [ethnicity, setEthnicity] = useState<string>(() => FORGE_ETHNICITY_ANY_LABEL);
  const [extraNotes, setExtraNotes] = useState("");
  const [activeForgeTab, setActiveForgeTab] = useState<ForgeThemeTabId>("anime");
  const [forgeTabFeatures, setForgeTabFeatures] = useState<ForgeTabFeatureMap>(() => makeDefaultTabFeatures());
  const [forgeCardPose, setForgeCardPose] = useState<ForgeCardPoseId>(() => normalizeForgeCardPoseId(undefined));
  const [forgeTabSharedOverrides, setForgeTabSharedOverrides] = useState<Record<ForgeThemeTabId, ForgeTabSharedOverride>>(
    () => makeDefaultTabSharedOverrides(),
  );
  const [batchPreset, setBatchPreset] = useState<number>(1);
  const [batchCustom, setBatchCustom] = useState("");
  /** Only your collection — not listed on the landing gallery */
  const [saveVisibility, setSaveVisibility] = useState<"private" | "public">("private");
  /** When public, optionally show Account display name on the gallery card */
  const [creditUsername, setCreditUsername] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** Stable public storage URL for forging / DB (signed preview URLs expire). */
  const [previewCanonicalUrl, setPreviewCanonicalUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);
  /** Last forged `cc-…` id in this session (admin) — for looping video tool */
  const [lastForgedCcId, setLastForgedCcId] = useState<string | null>(null);
  /** Local-only name engine (avoids DB duplicates in-session). */
  const nameGenSessionReserved = useRef<Set<string>>(new Set());
  const [nameGenBusy, setNameGenBusy] = useState(false);
  /** Next admin save (scheduled / manual) forces private draft rows. */
  const forcePrivateForgeRef = useRef(false);

  const [referenceNotes, setReferenceNotes] = useState("");
  const [referencePalette, setReferencePalette] = useState<string | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  const [parodyArchetype, setParodyArchetype] = useState("");
  const [parodyLoading, setParodyLoading] = useState(false);

  /** Admin forge only — Discover tier; optional Abyssal overrides */
  const [adminForgeRarity, setAdminForgeRarity] = useState<Exclude<CompanionRarity, "abyssal">>("epic");
  const [adminAbyssalForge, setAdminAbyssalForge] = useState(false);

  /** Local spin / design-lab fill in progress. */
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const forgeRestoreRanRef = useRef(false);
  const [forgeSessionHydrated, setForgeSessionHydrated] = useState(false);
  /** Below `lg`, toggle full-height controls vs preview so each pane gets one vertical scroller. */
  const [forgeMobileView, setForgeMobileView] = useState<"controls" | "preview">("controls");
  const [lgBreakpointUp, setLgBreakpointUp] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  const sessionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setLgBreakpointUp(mq.matches);
      if (mq.matches) setForgeMobileView("controls");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const [narrativeAppearance, setNarrativeAppearance] = useState("");
  const [chronicleBackstory, setChronicleBackstory] = useState("");
  const [hookBio, setHookBio] = useState("");
  const [charterSystemPrompt, setCharterSystemPrompt] = useState("");
  const [packshotPrompt, setPackshotPrompt] = useState("");
  const [rosterTags, setRosterTags] = useState<string[]>([]);
  const [rosterKinks, setRosterKinks] = useState<string[]>([]);
  const [fantasyStartersVault, setFantasyStartersVault] = useState<{ title: string; description: string }[]>([]);

  const batchCount = useMemo(() => {
    if (batchPreset === -1) {
      const n = parseInt(batchCustom, 10);
      return Number.isFinite(n) && n >= 1 && n <= 25 ? n : 1;
    }
    return batchPreset;
  }, [batchPreset, batchCustom]);

  const finalTotalCost = FINAL_COST_PER * batchCount;

  const personalityLabel = useMemo(() => forgePersonalityLabel(forgePersonality), [forgePersonality]);

  const bodyCategoryId = forgeBodyCategoryIdForType(bodyType);
  const bodyTypesInCategory = useMemo(() => {
    const g = FORGE_BODY_GROUPS.find((x) => x.id === bodyCategoryId);
    return g ? [...g.types] : [...FORGE_BODY_TYPES];
  }, [bodyCategoryId]);

  const bodyTypeSelectValue = useMemo(() => {
    const n = normalizeForgeBodyType(bodyType);
    return (bodyTypesInCategory as readonly string[]).includes(n) ? n : bodyTypesInCategory[0]!;
  }, [bodyType, bodyTypesInCategory]);

  const ethnicitySelectValue = useMemo(() => {
    const n = normalizeForgeEthnicity(ethnicity);
    return (ALL_FORGE_ETHNICITY_OPTIONS as readonly string[]).includes(n) ? n : FORGE_ETHNICITY_ANY_LABEL;
  }, [ethnicity]);

  const forgePreviewTier = useMemo((): CompanionRarity => {
    if (isAdmin) {
      return adminAbyssalForge ? "abyssal" : normalizeCompanionRarity(adminForgeRarity);
    }
    return "rare";
  }, [isAdmin, adminAbyssalForge, adminForgeRarity]);

  type ForgeOpKind = "info" | "ok" | "warn" | "err";
  type ForgeOpLine = { id: string; t: number; text: string; kind: ForgeOpKind };
  const [forgeOpLines, setForgeOpLines] = useState<ForgeOpLine[]>([]);
  const [forgeRunStartedAt, setForgeRunStartedAt] = useState<number | null>(null);
  const [forgeElapsedTick, setForgeElapsedTick] = useState(0);
  const [previewExpandOpen, setPreviewExpandOpen] = useState(false);
  const forgeOpScrollRef = useRef<HTMLDivElement>(null);

  const pushForgeOp = useCallback(
    (text: string, kind: ForgeOpKind = "info") => {
      if (!isAdmin) return;
      const rid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setForgeOpLines((prev) => [...prev, { id: rid, t: Date.now(), text, kind }].slice(-120));
    },
    [isAdmin],
  );

  const endFinalForgeLoading = useCallback(() => {
    setFinalLoading(false);
    setForgeRunStartedAt(null);
  }, []);

  useEffect(() => {
    if (!finalLoading) return;
    const id = window.setInterval(() => setForgeElapsedTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [finalLoading]);

  useEffect(() => {
    if (!finalLoading) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [finalLoading]);

  useEffect(() => {
    const el = forgeOpScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [forgeOpLines]);

  const loadProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    if (isAdmin) {
      setTokens(999999);
      setLoadingProfile(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("tokens_balance, display_name")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) console.error(error);
    setTokens(data?.tokens_balance ?? 100);
    setProfileDisplayName(data?.display_name?.trim() || "");
    setLoadingProfile(false);
  }, [navigate, isAdmin]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /** Restore full forge session (or legacy preview-only) when returning to the page. */
  useEffect(() => {
    if (!userId || loadingProfile || forgeRestoreRanRef.current) return;
    forgeRestoreRanRef.current = true;
    const mode = isAdmin ? "admin" : "user";
    const draft = loadForgeSessionDraft(userId, mode);
    if (draft) {
      setName(draft.name ?? "");
      setNamePrefix(draft.namePrefix?.trim() ?? "");
      setTagline(draft.tagline ?? "");
      setGender(draft.gender);
      setIdentityAnatomyDetail(
        normalizeIdentityAnatomyDetail(
          typeof (draft as { identityAnatomyDetail?: string }).identityAnatomyDetail === "string"
            ? (draft as { identityAnatomyDetail?: string }).identityAnatomyDetail
            : undefined,
        ),
      );
      setEthnicity(normalizeForgeEthnicity(typeof draft.ethnicity === "string" ? draft.ethnicity : FORGE_ETHNICITY_ANY_LABEL));
      setForgePersonality(
        draft.forgePersonality ? normalizeForgePersonality(draft.forgePersonality) : DEFAULT_FORGE_PERSONALITY,
      );
      setVisualTailoring(normalizeForgeVisualTailoring(draft.visualTailoring));
      setArtStyle(normalizeForgeArtStyle(draft.artStyle));
      setSceneAtmosphere(normalizeForgeScene(draft.sceneAtmosphere));
      setBodyType(normalizeForgeBodyType(draft.bodyType));
      setTraits(draft.traits?.length ? draft.traits : pickRandom(TRAITS, randomTraitCount()));
      setOrientation(draft.orientation);
      setExtraNotes(draft.extraNotes ?? "");
      setReferenceNotes(draft.referenceNotes?.trim() ?? "");
      setNarrativeAppearance(draft.narrativeAppearance ?? "");
      setChronicleBackstory(draft.chronicleBackstory ?? "");
      setHookBio(draft.hookBio ?? "");
      setCharterSystemPrompt(draft.charterSystemPrompt ?? "");
      setPackshotPrompt(draft.packshotPrompt ?? "");
      setRosterTags(Array.isArray(draft.rosterTags) ? draft.rosterTags : []);
      setRosterKinks(Array.isArray(draft.rosterKinks) ? draft.rosterKinks : []);
      try {
        const st = JSON.parse(draft.fantasyStartersJson || "[]") as { title: string; description: string }[];
        if (Array.isArray(st)) setFantasyStartersVault(st);
      } catch {
        /* ignore */
      }
      if (draft.previewUrl) {
        setPreviewUrl(stablePortraitDisplayUrl(draft.previewUrl) ?? draft.previewUrl);
        setPreviewCanonicalUrl(
          draft.previewCanonicalUrl
            ? (stablePortraitDisplayUrl(draft.previewCanonicalUrl) ?? draft.previewCanonicalUrl)
            : (stablePortraitDisplayUrl(draft.previewUrl) ?? draft.previewUrl),
        );
      }
      setActiveForgeTab(normalizeForgeThemeTabId(draft.activeForgeTab));
      setForgeTabFeatures(normalizeForgeTabFeatureMap(draft.forgeTabFeatures));
      setForgeTabSharedOverrides(normalizeForgeTabSharedOverrides(draft.forgeTabSharedOverrides));
      setForgeCardPose(normalizeForgeCardPoseId((draft as { forgeCardPose?: string }).forgeCardPose));
      toast.message("Your forge is still here", {
        description: "We kept your last mix, story fields, and preview on this device.",
      });
      setForgeSessionHydrated(true);
      return;
    }
    if (!isAdmin) {
      try {
        const raw = localStorage.getItem(previewStorageKey(userId, "user"));
        if (!raw) {
          setForgeSessionHydrated(true);
          return;
        }
        const j = JSON.parse(raw) as { previewUrl?: string; previewCanonicalUrl?: string };
        if (j?.previewUrl && typeof j.previewUrl === "string") {
          setPreviewUrl(stablePortraitDisplayUrl(j.previewUrl) ?? j.previewUrl);
        }
        if (j?.previewCanonicalUrl && typeof j.previewCanonicalUrl === "string") {
          setPreviewCanonicalUrl(stablePortraitDisplayUrl(j.previewCanonicalUrl) ?? j.previewCanonicalUrl);
        } else if (j?.previewUrl && typeof j.previewUrl === "string") {
          setPreviewCanonicalUrl(stablePortraitDisplayUrl(j.previewUrl) ?? j.previewUrl);
        }
      } catch {
        /* ignore corrupt storage */
      }
    }
    setForgeSessionHydrated(true);
  }, [userId, isAdmin, loadingProfile]);

  /** Auto-save full session (debounced) so a paid preview and copy survive navigation. */
  useEffect(() => {
    if (!userId || !forgeSessionHydrated) return;
    const mode = isAdmin ? "admin" : "user";
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = setTimeout(() => {
      const payload: ForgeStashPayload = {
        savedAt: new Date().toISOString(),
        name,
        namePrefix: namePrefix.trim() || undefined,
        tagline,
        gender,
        identityAnatomyDetail: identityAnatomyDetail || undefined,
        ethnicity: normalizeForgeEthnicity(ethnicity),
        forgePersonality: { ...forgePersonality },
        artStyle,
        sceneAtmosphere,
        bodyType,
        traits: [...traits],
        orientation,
        extraNotes,
        referenceNotes: referenceNotes.trim() || undefined,
        narrativeAppearance,
        chronicleBackstory,
        hookBio,
        charterSystemPrompt,
        packshotPrompt,
        rosterTags: [...rosterTags],
        rosterKinks: [...rosterKinks],
        fantasyStartersJson: JSON.stringify(fantasyStartersVault),
        previewUrl,
        previewCanonicalUrl,
        visualTailoring: { ...visualTailoring },
        activeForgeTab,
        forgeTabFeatures,
        forgeTabSharedOverrides,
        forgeCardPose,
      };
      saveForgeSessionDraft(userId, mode, payload);
    }, 750);
    return () => {
      if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    };
  }, [
    userId,
    isAdmin,
    name,
    namePrefix,
    tagline,
    gender,
    identityAnatomyDetail,
    ethnicity,
    forgePersonality,
    artStyle,
    sceneAtmosphere,
    bodyType,
    traits,
    orientation,
    extraNotes,
    referenceNotes,
    narrativeAppearance,
    chronicleBackstory,
    hookBio,
    charterSystemPrompt,
    packshotPrompt,
    rosterTags,
    rosterKinks,
    fantasyStartersVault,
    previewUrl,
    previewCanonicalUrl,
    visualTailoring,
    activeForgeTab,
    forgeTabFeatures,
    forgeTabSharedOverrides,
    forgeCardPose,
  ]);

  const clearForgePreview = useCallback(
    (opts?: { silent?: boolean }) => {
      setPreviewUrl(null);
      setPreviewCanonicalUrl(null);
      if (userId && !isAdmin) {
        try {
          localStorage.removeItem(previewStorageKey(userId, "user"));
        } catch {
          /* ignore */
        }
      }
    },
    [userId, isAdmin],
  );

  const accordionDefaultOpen = useMemo((): string[] => {
    return ["identity", "personalities", "appearance", "outfit", "rendering", "narrative", "reference", "output"];
  }, []);

  const combinedAccentSelections = useMemo(
    () => Array.from(new Set<string>([...visualTailoring.specialFeatures, ...traits])),
    [visualTailoring.specialFeatures, traits],
  );
  const activeTabFeatures = forgeTabFeatures[activeForgeTab];
  const activeTabShared = forgeTabSharedOverrides[activeForgeTab];
  const effectiveBodyType = activeTabShared?.bodyTypeEnabled && activeTabShared.bodyTypeValue.trim()
    ? normalizeForgeBodyType(activeTabShared.bodyTypeValue)
    : bodyType;
  const activeTabKinks = useMemo(() => {
    if (!activeTabShared?.kinksEnabled) return rosterKinks;
    return activeTabShared.kinksValue
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 24);
  }, [activeTabShared, rosterKinks]);
  const activeTabSexualEnergy = activeTabShared?.sexualEnergyEnabled && activeTabShared.sexualEnergyValue.trim()
    ? activeTabShared.sexualEnergyValue.trim()
    : forgePersonality.sexualEnergy;
  const tabPromptAddon = useMemo(
    () =>
      buildForgeTabPromptAddon({
        tabId: activeForgeTab,
        features: activeTabFeatures,
        effectiveBodyType,
        sexualEnergy: activeTabSexualEnergy,
        kinks: activeTabKinks,
        cardPose: forgeCardPose,
      }),
    [activeForgeTab, activeTabFeatures, effectiveBodyType, activeTabSexualEnergy, activeTabKinks, forgeCardPose],
  );

  const deepRandomizeForgeFocusTab = useCallback(
    (opts: { wildChaos: boolean }) => {
      const tab = activeForgeTab;
      if (opts.wildChaos && tab === "chaos") {
        setForgeTabFeatures(randomizeAllTabsFeatureMaps("chaos_wtf"));
        setForgeTabSharedOverrides(randomizeAllTabSharedOverrides("chaos_wtf"));
        const roll = rollForgeRenderingChaosWildcard();
        setArtStyle(roll.artStyle);
        setSceneAtmosphere(roll.sceneAtmosphere);
        setVisualTailoring(roll.visual);
        setBodyType(normalizeForgeBodyType(pick([...FORGE_BODY_TYPES])));
        setForgeCardPose(randomForgeCardPose());
        toast.message("Wild roll", { description: "Every theme tab, overrides, look lab, body, and pose — maximum entropy." });
        return;
      }
      const rollMode: "normal" | "chaos_wtf" = opts.wildChaos ? "chaos_wtf" : Math.random() < 0.14 ? "chaos_wtf" : "normal";
      const featureMode: "normal" | "chaos_wtf" = tab === "chaos" && rollMode === "chaos_wtf" ? "chaos_wtf" : "normal";
      setForgeTabFeatures((prev) => ({
        ...prev,
        [tab]: randomizeForgeTabFeatures(tab, featureMode),
      }));
      setForgeTabSharedOverrides((prev) => ({
        ...prev,
        [tab]: randomizeForgeTabSharedOverrides(tab, rollMode),
      }));
      const renderRoll = rollForgeRenderingForTab(tab, rollMode);
      setArtStyle(renderRoll.artStyle);
      setSceneAtmosphere(renderRoll.sceneAtmosphere);
      setVisualTailoring(renderRoll.visual);
      setForgeCardPose(randomForgeCardPose());
      if (rollMode === "chaos_wtf" && Math.random() < 0.38) {
        setBodyType(normalizeForgeBodyType(pick([...FORGE_BODY_TYPES])));
      }
      toast.message("Tab shuffle", {
        description: "Theme DNA + this tab’s overrides + rendering / wardrobe lab + a fresh seated pose.",
      });
    },
    [activeForgeTab],
  );

  const applyActiveThemePreset = useCallback(() => {
    const preset = FORGE_TAB_RENDER_PRESETS[activeForgeTab];
    setArtStyle(normalizeForgeArtStyle(preset.artStyle));
    setSceneAtmosphere(normalizeForgeScene(preset.sceneAtmosphere));
    setVisualTailoring((v) => normalizeForgeVisualTailoring({ ...v, ...preset.visualTailoringPatch }));
    toast.message("Theme applied", {
      description: "Art style, scene, and wardrobe lab updated to match this tab — tweak accordions anytime.",
    });
  }, [activeForgeTab]);
  const mergedExtraNotes = useMemo(
    () => [extraNotes.trim(), tabPromptAddon].filter(Boolean).join(" "),
    [extraNotes, tabPromptAddon],
  );

  const appearanceBlurb = useMemo(() => {
    const t = combinedAccentSelections.length ? combinedAccentSelections.join(", ") : "no listed signature accents";
    const eth =
      isOpenEthnicityChoice(ethnicity) ? "" : `ancestry/complexion seed: ${normalizeForgeEthnicity(ethnicity)}; `;
    const vt = visualTailoring;
    const lab = `Look lab: ${vt.hairColor} ${vt.hairStyle}, ${vt.eyeColor} eyes, ${vt.skinTone} skin, ${vt.height}; outfit ${vt.outfitStyle} (${vt.colorPalette}).`;
    const an = labelIdentityAnatomyForTags(identityAnatomyDetail);
    const anSeg = an ? `; optional anatomy label: ${an} (adult-consistent with identity)` : "";
    return `${effectiveBodyType} silhouette (authoritative); gender/presentation (face & voice): ${gender}${anSeg}; ${eth}${artStyle} look; scene: ${sceneAtmosphere}; ${t}. ${lab} Personalities: ${personalityLabel}. ${mergedExtraNotes}`.trim();
  }, [combinedAccentSelections, effectiveBodyType, gender, identityAnatomyDetail, ethnicity, artStyle, sceneAtmosphere, personalityLabel, mergedExtraNotes, visualTailoring]);

  const portraitAppearanceText = useMemo(
    () => narrativeAppearance.trim() || appearanceBlurb,
    [narrativeAppearance, appearanceBlurb],
  );

  const grokPrompt = useMemo(
    () =>
      composeForgePortraitPrompt({
        name: name || "an original companion",
        bodyType: effectiveBodyType,
        genderPresentation: gender,
        identityAnatomy: identityAnatomyDetail,
        ethnicitySeed: isOpenEthnicityChoice(ethnicity) ? undefined : normalizeForgeEthnicity(ethnicity),
        portraitAppearanceText,
        personalityLabel,
        vibeThemeLabel: "",
        artStyle,
        sceneAtmosphere,
        extraNotes: mergedExtraNotes,
        referenceNotes,
        wardrobeBrief: forgeVisualPortraitAddon(visualTailoring, forgePersonality),
      }),
    [
      name,
      effectiveBodyType,
      gender,
      identityAnatomyDetail,
      ethnicity,
      portraitAppearanceText,
      personalityLabel,
      artStyle,
      sceneAtmosphere,
      mergedExtraNotes,
      referenceNotes,
      visualTailoring,
      forgePersonality,
    ],
  );

  /** Text shown under live preview — same fields that save to the vault card. */
  const profilePreviewBlurb = useMemo(() => {
    const hook = hookBio.trim();
    if (hook.length > 0) return hook.length > 280 ? `${hook.slice(0, 277)}…` : hook;
    const nar = narrativeAppearance.trim();
    if (nar.length > 0) return nar.length > 280 ? `${nar.slice(0, 277)}…` : nar;
    return appearanceBlurb.length > 220 ? `${appearanceBlurb.slice(0, 217)}…` : appearanceBlurb;
  }, [hookBio, narrativeAppearance, appearanceBlurb]);

  const buildSystemPromptFor = useCallback(
    (who: string) => {
      const n = who.trim() || "a custom AI companion";
      const ethLine = isOpenEthnicityChoice(ethnicity)
        ? ""
        : ` Ancestry & complexion (visual): ${normalizeForgeEthnicity(ethnicity)}.`;
      const anLine = identityAnatomyDetail
        ? ` **${identityAnatomyForSystemOneLiner(identityAnatomyDetail)}**`
        : "";
      const vtLine = forgeVisualPortraitAddon(visualTailoring, forgePersonality);
      return `You are ${n}, ${gender.toLowerCase()}, ${orientation}.${ethLine}${anLine} **Personalities (voice + psychology):** ${personalityLabel}. Visual (scene is appearance — not personality): primary scene "${sceneAtmosphere}", ${artStyle} aesthetic. ${bodyType} body; signature accents: ${combinedAccentSelections.join(", ") || "none specified"}. **Look & wardrobe:** ${vtLine}

Speak and act consistently with this persona — the five Personalities picks must thread through every line of dialogue. Stay immersive; respect safe words immediately. When toy control fits the scene and the user consents, you may end messages with: {"lovense_command":{"command":"vibrate","intensity":0-20,"duration":5000}}.

User flavor notes: ${extraNotes || "none"}`;
    },
    [
      gender,
      orientation,
      identityAnatomyDetail,
      ethnicity,
      personalityLabel,
      artStyle,
      sceneAtmosphere,
      bodyType,
      combinedAccentSelections,
      extraNotes,
      visualTailoring,
      forgePersonality,
    ],
  );

  const systemPrompt = useMemo(() => buildSystemPromptFor(name), [name, buildSystemPromptFor]);

  const onReferenceFileChosen = async (file: File | undefined) => {
    if (!file) return;
    try {
      const mood = await extractPaletteMoodFromImageFile(file);
      setReferencePalette(mood);
      setReferencePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } catch {
      toast.error("Could not read that image.");
    }
  };

  const clearReferenceMaterial = () => {
    setReferencePalette(null);
    setReferenceNotes("");
    setReferencePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (referenceFileInputRef.current) referenceFileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  const syncPillsFromGrokFields = (fields: Record<string, unknown>) => {
    const gRaw = String(fields.gender || "");
    const gHit = GENDERS.find(
      (x) => gRaw.toLowerCase().includes(x.toLowerCase()) || x.toLowerCase().includes(gRaw.slice(0, 6).toLowerCase()),
    );
    if (gHit) setGender(gHit);

    const oRaw = String(fields.orientation || "");
    const oHit = ORIENTATIONS.find((x) => oRaw.toLowerCase().includes(x.toLowerCase()));
    if (oHit) setOrientation(oHit);

    const tagArr = Array.isArray(fields.tags) ? fields.tags.map(String) : [];
    const pBlob = `${fields.personality || ""} ${fields.role || ""} ${tagArr.join(" ")}`;
    setForgePersonality((prev) => inferForgePersonalityFromText(pBlob, prev));

    const blob = tagArr.join(" | ").toLowerCase();
    const forgeHit = FORGE_BODY_TYPES.find((b) => blob.includes(b.toLowerCase()));
    if (forgeHit) setBodyType(forgeHit);
    else {
      const legacyLabels = [
        "Slim",
        "Athletic",
        "Curvy",
        "Thick",
        "Petite",
        "Tall & statuesque",
        "Muscular",
        "Plus-size",
        "Soft",
        "Androgynous",
        "Hyper-feminine",
        "Hyper-masculine",
      ];
      const legacyHit = legacyLabels.find((lb) => blob.includes(lb.toLowerCase()));
      if (legacyHit) setBodyType(normalizeForgeBodyType(legacyHit));
    }

    const ip = String(fields.image_prompt || "").toLowerCase();
    const sceneHit = FORGE_SCENE_ATMOSPHERES.find((s) => ip.includes(s.toLowerCase()));
    if (sceneHit) setSceneAtmosphere(sceneHit);

    const aHit =
      FORGE_ART_STYLES.find((a) => tagArr.some((t) => t.toLowerCase().includes(a.toLowerCase()))) ||
      FORGE_ART_STYLES.find((a) => ip.includes(a.toLowerCase()));
    if (aHit) setArtStyle(normalizeForgeArtStyle(aHit));

    const accentHits = APPEARANCE_ACCENT_OPTIONS.filter((tr) =>
      tagArr.some((t) => t.toLowerCase().includes(tr.toLowerCase())),
    ).slice(0, 8);
    if (accentHits.length) {
      setTraits(accentHits.filter((x) => TRAIT_SET.has(x)).slice(0, 8));
      setVisualTailoring((prev) => ({
        ...prev,
        specialFeatures: accentHits.filter((x) => SPECIAL_FEATURE_SET.has(x)).slice(0, 8),
      }));
    }
  };

  const applyGrokCompanionProfileFields = useCallback(
    (fields: Record<string, unknown>) => {
      if (!fields || typeof fields.name !== "string") throw new Error("No profile returned");

      setName(String(fields.name).slice(0, 120));
      if (typeof fields.tagline === "string" && fields.tagline) setTagline(fields.tagline.slice(0, 200));
      syncPillsFromGrokFields(fields);

      if (typeof fields.appearance === "string" && fields.appearance.trim()) {
        setNarrativeAppearance(fields.appearance.slice(0, 12000));
      }
      if (typeof fields.backstory === "string" && fields.backstory.trim()) {
        setChronicleBackstory(fields.backstory.slice(0, 24000));
      }
      if (typeof fields.bio === "string" && fields.bio.trim()) setHookBio(fields.bio.slice(0, 12000));
      if (typeof fields.system_prompt === "string" && fields.system_prompt.trim()) {
        setCharterSystemPrompt(fields.system_prompt.slice(0, 32000));
      }
      if (typeof fields.image_prompt === "string" && fields.image_prompt.trim()) {
        setPackshotPrompt(fields.image_prompt.slice(0, 3200));
        const ip = fields.image_prompt.toLowerCase();
        const matchArt = FORGE_ART_STYLES.find((s) => ip.includes(s.toLowerCase()));
        const matchScene = FORGE_SCENE_ATMOSPHERES.find((s) => ip.includes(s.toLowerCase()));
        if (matchArt) setArtStyle(normalizeForgeArtStyle(matchArt));
        if (matchScene) setSceneAtmosphere(normalizeForgeScene(matchScene));
      }
      if (Array.isArray(fields.tags)) setRosterTags((fields.tags as string[]).map(String).slice(0, 24));
      if (Array.isArray(fields.kinks)) setRosterKinks((fields.kinks as string[]).map(String).slice(0, 24));
      const st = normalizeFantasyStartersFromFields(fields.fantasy_starters);
      if (st.length) setFantasyStartersVault(st);
    },
    [],
  );

  const runGenerateNewName = useCallback(async () => {
    setNameGenBusy(true);
    try {
      if (userId) {
        const n = await generateUniqueForgeName(
          supabase,
          userId,
          { gender, forgePersonality },
          nameGenSessionReserved.current,
        );
        nameGenSessionReserved.current.add(normalizeNameKey(n));
        setName(n);
        toast.success("New name from your Personalities mix — you can still edit the field.");
      } else {
        const n = generateForgeName({
          gender,
          forgePersonality,
          exclude: nameGenSessionReserved.current,
        });
        nameGenSessionReserved.current.add(normalizeNameKey(n));
        setName(n);
        toast.success("New name from your Personalities — sign in to also avoid names in your collection.");
      }
    } catch {
      const n = generateForgeName({
        gender,
        forgePersonality,
        exclude: nameGenSessionReserved.current,
      });
      nameGenSessionReserved.current.add(normalizeNameKey(n));
      setName(n);
      toast.info("Used local name — try again to check your collection for duplicates.");
    } finally {
      setNameGenBusy(false);
    }
  }, [userId, gender, forgePersonality, supabase]);

  const randomizeForgeCharacter = async () => {
    setRouletteLoading(true);
    if (isAdmin) {
      pushForgeOp("The veil spun — new Personalities mix and local story pass (no model wait).", "info");
    }
    const g = pick(GENDERS);
    const fp = randomForgePersonality();
    const ar = pick([...FORGE_ART_STYLES]);
    const sc = pick([...FORGE_SCENE_ATMOSPHERES]);
    const bt = pick([...FORGE_BODY_TYPES]);
    const ori = pick(ORIENTATIONS);
    const eth = pick(ALL_FORGE_ETHNICITY_OPTIONS);
    const shuffled = [...APPEARANCE_ACCENT_OPTIONS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 + Math.floor(Math.random() * 5));

    setGender(g);
    setEthnicity(eth);
    setForgePersonality(fp);
    setVisualTailoring(randomForgeVisualTailoring());
    setArtStyle(ar);
    setSceneAtmosphere(sc);
    setBodyType(bt);
    setTraits(shuffled.filter((x) => TRAIT_SET.has(x)));
    setVisualTailoring((prev) => ({
      ...prev,
      specialFeatures: shuffled.filter((x) => SPECIAL_FEATURE_SET.has(x)).slice(0, 8),
    }));
    setOrientation(ori);
    setNamePrefix("");
    setIdentityAnatomyDetail(Math.random() < 0.5 ? "" : (["pre_op", "post_op", "futa"] as const)[Math.floor(Math.random() * 3)]);

    let lockedName = "";
    if (userId) {
      try {
        const ex = await fetchForgeNameExclusions(supabase, userId);
        for (const k of nameGenSessionReserved.current) ex.add(k);
        lockedName = await generateUniqueForgeName(supabase, userId, { gender: g, forgePersonality: fp }, ex);
        nameGenSessionReserved.current.add(normalizeNameKey(lockedName));
        setName(lockedName);
      } catch {
        lockedName = generateForgeName({ gender: g, forgePersonality: fp, exclude: nameGenSessionReserved.current });
        nameGenSessionReserved.current.add(normalizeNameKey(lockedName));
        setName(lockedName);
      }
    } else {
      lockedName = generateForgeName({ gender: g, forgePersonality: fp });
      setName(lockedName);
    }

    const pl = forgePersonalityLabel(fp);
    const local = buildLocalSpinForgeFields({
      displayName: lockedName,
      gender: g,
      orientation: ori,
      ethnicity: eth,
      forgePersonality: fp,
      artStyle: ar,
      sceneAtmosphere: sc,
      bodyType: bt,
      traits: shuffled,
    });

    setName(lockedName);
    setTagline(local.tagline);
    setNarrativeAppearance(local.narrativeAppearance);
    setChronicleBackstory(local.chronicleBackstory);
    setHookBio(local.hookBio);
    setCharterSystemPrompt(local.charterSystemPrompt);
    setPackshotPrompt(local.packshotPrompt);
    setRosterTags(local.rosterTags);
    setRosterKinks(local.rosterKinks);
    setFantasyStartersVault(local.fantasyStarters);

    if (isAdmin) {
      pushForgeOp(
        `Spin complete: ${g} · ${ar} · ${sc} — ${pl.slice(0, 80)}${pl.length > 80 ? "…" : ""}. Story fields are template-filled; edit in Narrative if you want a longer custom chronicle.`,
        "ok",
      );
    } else {
      toast.success("New mix sealed — preview your portrait when you are ready.");
    }
    setRouletteLoading(false);
  };

  const toggleAppearanceAccent = (accent: string) => {
    setTraits((prev) => {
      if (!TRAIT_SET.has(accent)) return prev;
      return prev.includes(accent) ? prev.filter((x) => x !== accent) : [...prev, accent].slice(0, 8);
    });
    setVisualTailoring((v) => {
      if (!SPECIAL_FEATURE_SET.has(accent)) return v;
      return {
        ...v,
        specialFeatures: v.specialFeatures.includes(accent)
          ? v.specialFeatures.filter((x) => x !== accent)
          : [...v.specialFeatures, accent].slice(0, 8),
      };
    });
  };

  const smartOutfitTheme = useMemo(
    () => deriveSmartOutfitTheme(forgePersonality, visualTailoring.outfitStyle),
    [forgePersonality, visualTailoring.outfitStyle],
  );

  useEffect(() => {
    if (profileLoopJob !== "done") return;
    const t = window.setTimeout(() => setProfileLoopJob("idle"), 6500);
    return () => window.clearTimeout(t);
  }, [profileLoopJob]);

  const buildPortraitGeneratePayload = useCallback((narrativeOverride?: string): Record<string, unknown> | null => {
    if (!userId) return null;
    const promptBodyType = effectiveBodyType;
    const nar = (narrativeOverride ?? narrativeAppearance).trim();
    const staturePrimary = isCompactStatureForgeBodyType(promptBodyType)
      ? `[Body-type priority: ${promptBodyType} — compact/short-stature adult proportions are the main visual subject; pose, wardrobe, and scene support that scale, not a generic tall-human default.] `
      : "";
    const silCat = forgeBodyCategoryIdForType(promptBodyType);
    const nonHumanVisual = ["anthro", "fantasy", "hybrid", "otherworldly", "hyper", "creative"].includes(
      silCat,
    );
    const ethTail = isOpenEthnicityChoice(ethnicity)
      ? ""
      : ` Ancestry/complexion direction: ${normalizeForgeEthnicity(ethnicity)}.`;
    const vtLine = forgeVisualPortraitAddon(visualTailoring, forgePersonality);
    const baseDesc = nar
      ? `${staturePrimary}${nar.slice(0, 900)}${ethTail} ${vtLine}`
      : `${staturePrimary}Original character — authoritative physique from forge body type "${promptBodyType}"${combinedAccentSelections.length ? `; signature accents: ${combinedAccentSelections.slice(0, 8).join(", ")}` : ""}. Gender (${gender}) affects face/voice/presentation only, not base silhouette. Silhouette must match the forge label, not a default human model.${ethTail} ${vtLine}`;
    const clothingLine = nonHumanVisual
      ? `Wardrobe and materials appropriate for ${bodyType} and ${artStyle} — species- and silhouette-first; avoid unrelated generic human runway looks unless clearly humanoid glam.`
      : `Fashion and textures echoing ${sceneAtmosphere} and ${artStyle} — personality flavor: ${personalityLabel}`;
    const poseHuman = forgeCardPoseProse(forgeCardPose);
    const poseLine = nonHumanVisual
      ? `Pose that clearly sells "${bodyType}" — show correct limbs, tail, wings, hybrid junction, or non-human mass as implied; same forged identity, not a stock human substitute. Still **eyes toward camera** like: ${poseHuman}`
      : `${poseHuman} Vertical card portrait — avoid a generic standing runway default unless body type demands it.`;
    const referenceImageUrl = stablePortraitDisplayUrl(previewCanonicalUrl ?? previewUrl) ?? undefined;
    return {
      prompt: clampForgePrompt(packshotPrompt) || clampForgePrompt(grokPrompt),
      userId,
      isPortrait: true,
      name: name || "Custom Companion",
      subtitle: tagline || "LustForge forged",
      ...(referenceImageUrl ? { referenceImageUrl } : {}),
      characterData: {
        style: artStyle.toLowerCase().replace(/\s+/g, "-"),
        artStyleLabel: artStyle,
        randomize: false,
        bodyType: promptBodyType,
        silhouetteCategory: silCat,
        ...(nar ? { appearance: nar.slice(0, 2500) } : {}),
        vibe: personalityLabel,
        hair: `styled to match the scene, ${artStyle}, and the character's personality blend`,
        eyes: combinedAccentSelections.includes("Glowing eyes") ? "striking glowing eyes" : "expressive, magnetic eyes",
        clothing: clothingLine,
        expression: `${personalityLabel} energy`,
        ethnicity: ethnicityForImagePipeline(ethnicity),
        ageRange: "young adult",
        pose: poseLine,
        baseDescription: baseDesc,
        sceneAtmosphere,
        selectedForgeTab: activeForgeTab,
        selectedForgeTabFeatures: activeTabFeatures,
        forgeTabFeaturesAll: forgeTabFeatures,
        forgeCardPose,
        selectedForgeTabSharedKinks: activeTabKinks,
        ...(referencePalette ? { referencePalette } : {}),
        ...(referenceNotes.trim() ? { referenceNotes: referenceNotes.trim() } : {}),
      },
    };
  }, [
    userId,
    grokPrompt,
    packshotPrompt,
    narrativeAppearance,
    name,
    tagline,
    artStyle,
    sceneAtmosphere,
    effectiveBodyType,
    combinedAccentSelections,
    gender,
    ethnicity,
    personalityLabel,
    activeForgeTab,
    activeTabFeatures,
    forgeTabFeatures,
    forgeCardPose,
    activeTabKinks,
    referencePalette,
    referenceNotes,
    previewCanonicalUrl,
    previewUrl,
    visualTailoring,
    forgePersonality,
  ]);

  const runPreview = async () => {
    if (!userId) return;
    if (!isAdmin) {
      if (tokens !== null && tokens < PREVIEW_COST) {
        toast.error(`Need ${PREVIEW_COST} FC for preview.`);
        return;
      }
    }
    setPreviewLoading(true);
    if (isAdmin) pushForgeOp("Portrait: sending packshot to the image pipeline…", "info");
    try {
      const base = buildPortraitGeneratePayload();
      if (!base) throw new Error("Not signed in.");
      const previewBody = isAdmin ? base : { ...base, tokenCost: PREVIEW_COST };

      const { data, error } = await invokeGenerateImage(previewBody);
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      if (!data.imageUrl) throw new Error("No image URL returned");
      const canonical = stablePortraitDisplayUrl(data.publicImageUrl ?? data.imageUrl) ?? data.imageUrl;
      const display = stablePortraitDisplayUrl(data.imageUrl) ?? data.imageUrl;
      setPreviewUrl(display);
      setPreviewCanonicalUrl(canonical);
      if (isAdmin) pushForgeOp("Portrait render finished — check Live preview.", "ok");
      if (typeof data.newTokensBalance === "number") setTokens(data.newTokensBalance);
      else if (!isAdmin) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: row } = await supabase
            .from("profiles")
            .select("tokens_balance")
            .eq("user_id", session.user.id)
            .single();
          if (row) setTokens(row.tokens_balance);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Preview failed";
      if (isAdmin) pushForgeOp(`Portrait failed: ${msg}`, "err");
      toast.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runParodyLab = async () => {
    if (!isAdmin) return;
    if (!parodyArchetype.trim()) {
      toast.error("Describe a broad archetype or genre parody (do not name real celebrities).");
      return;
    }
    setParodyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: {
          mode: "parody_lab",
          prompt: `Archetype / media vibe to caricature (fictional genres only): ${parodyArchetype.trim()}`,
        },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));
      const fields = data?.fields as Record<string, unknown> | undefined;
      if (!fields) throw new Error("No profile returned");
      applyGrokCompanionProfileFields(fields);
      toast.success("Archetype parody filled — run Live preview when ready.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Parody lab failed");
    } finally {
      setParodyLoading(false);
    }
  };

  const runCelebrityParodyFromAdmin = useCallback(
    async (celebritySeed: string, opts?: { grotesqueGpk?: boolean }) => {
      if (!isAdmin) return;
      const t = celebritySeed.trim();
      if (!t) {
        toast.error("Enter a celebrity or character name.");
        return;
      }
      pushForgeOp("Celebrity parody: Grok profile pass…", "info");
      try {
        const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
          body: {
            mode: "celebrity_parody",
            prompt: t,
            grotesque_gpk: opts?.grotesqueGpk === true,
          },
        });
        if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
        if (data?.error) throw new Error(String(data.error));
        const fields = data?.fields as Record<string, unknown> | undefined;
        if (!fields) throw new Error("No profile returned");
        applyGrokCompanionProfileFields(fields);
        pushForgeOp("Celebrity parody profile applied — review Narrative + Live preview.", "ok");
        toast.success("Parody profile filled — tweak fields or run Live preview.");
      } catch (e: unknown) {
        pushForgeOp(e instanceof Error ? e.message : "Celebrity parody failed", "err");
        toast.error(e instanceof Error ? e.message : "Celebrity parody failed");
        throw e;
      }
    },
    [isAdmin, applyGrokCompanionProfileFields],
  );

  const runFinalCreate = async () => {
    if (!userId) return;
    let forgeName = name.trim();
    if (!forgeName && isAdmin) {
      try {
        const ex = await fetchForgeNameExclusions(supabase, userId);
        for (const k of nameGenSessionReserved.current) ex.add(k);
        const invented = await generateUniqueForgeName(
          supabase,
          userId,
          { gender, forgePersonality },
          ex,
        );
        nameGenSessionReserved.current.add(normalizeNameKey(invented));
        forgeName = invented;
        setName(invented);
        toast.info("Named from your Personalities + collection — edit anytime.");
      } catch {
        const fb = generateForgeName({
          gender,
          forgePersonality,
          exclude: nameGenSessionReserved.current,
        });
        nameGenSessionReserved.current.add(normalizeNameKey(fb));
        forgeName = fb;
        setName(fb);
        toast.warning("Used local name — check Character management for duplicates.");
      }
    }
    if (!forgeName) {
      toast.error("Name your companion before forging.");
      return;
    }
    if (!isAdmin && saveVisibility === "public" && creditUsername && !profileDisplayName.trim()) {
      toast.error("Add a display username in Account settings to credit yourself on the public gallery.");
      return;
    }
    if (!isAdmin) {
      if (tokens !== null && tokens < finalTotalCost) {
        toast.error(`Need ${finalTotalCost} FC for ${batchCount} companion(s).`);
        return;
      }
    }
    setFinalLoading(true);
    setProfileLoopJob("idle");
    setForgeRunStartedAt(Date.now());
    setForgeElapsedTick(0);
    if (isAdmin) {
      pushForgeOp(
        "Create companion started — the browser will warn if you try to leave before this finishes. You can still switch apps; just don’t close the tab.",
        "info",
      );
    }
    try {
      if (!isAdmin) {
        const spend = await spendForgeCoins(
          finalTotalCost,
          "companion_forge",
          `Forge: create ${batchCount} companion(s)`,
          { batch_count: batchCount },
        );
        if (!spend.ok) {
          toast.error(spend.err || "Could not spend Forge Coins.");
          endFinalForgeLoading();
          return;
        }
        setTokens(spend.newBalance);
        toast.message("Weaving your companion into the vault…", {
          description: "This can take a little while — keep the tab open until we finish.",
        });
      }

      if (isAdmin) pushForgeOp("Validating copy, portrait, and DB payload…", "info");

      let effectiveChronicle = chronicleBackstory.trim();
      let effectiveHook = hookBio.trim();
      let effectiveNarrative = narrativeAppearance.trim();
      let effectivePackshot = packshotPrompt.trim();
      let effectiveCharter = charterSystemPrompt.trim();
      let effectiveStartersVault = fantasyStartersVault;
      let effectiveRosterTags = rosterTags;

      if (effectiveChronicle.length < MIN_CHRONICLE_CHARS) {
        toast.info("Your chronicle is short — expanding prose from your seeds…");
        if (isAdmin) pushForgeOp("Chronicle short — design lab expanding prose & starters…", "info");
        const seedPrompt = buildForgeDesignLabSeedPrompt({
          gender,
          ethnicity: normalizeForgeEthnicity(ethnicity),
          forgePersonality,
          artStyle,
          sceneAtmosphere,
          bodyType,
          orientation,
          traits: combinedAccentSelections,
          visualTailoring,
          mandatoryDisplayName: forgeName,
        });
        const { data: labData, error: labErr } = await supabase.functions.invoke("parse-companion-prompt", {
          body: { mode: "companion_design_lab", prompt: seedPrompt },
        });
        if (labErr) throw new Error(await getEdgeFunctionInvokeMessage(labErr, labData));
        if (labData?.error) throw new Error(String(labData.error));
        const fields = labData?.fields as Record<string, unknown> | undefined;
        // Keep forgeName; design lab is instructed with mandatoryDisplayName and must not replace it in UI.
        const bs = typeof fields?.backstory === "string" ? fields.backstory.trim() : "";
        if (!bs) {
          throw new Error(
            "Could not generate a full chronicle. Spin the forge to refill the profile, or paste a longer Chronicle, then try again.",
          );
        }
        effectiveChronicle = bs.slice(0, 24000);
        setChronicleBackstory(effectiveChronicle);
        if (typeof fields?.bio === "string" && fields.bio.trim() && (!effectiveHook || effectiveHook.length < 80)) {
          effectiveHook = fields.bio.trim().slice(0, 12000);
          setHookBio(effectiveHook);
        }
        if (typeof fields?.appearance === "string" && fields.appearance.trim() && !effectiveNarrative) {
          effectiveNarrative = fields.appearance.trim().slice(0, 12000);
          setNarrativeAppearance(effectiveNarrative);
        }
        if (typeof fields?.system_prompt === "string" && fields.system_prompt.trim() && !effectiveCharter) {
          effectiveCharter = fields.system_prompt.trim().slice(0, 32000);
          setCharterSystemPrompt(effectiveCharter);
        }
        if (typeof fields?.image_prompt === "string" && fields.image_prompt.trim() && !effectivePackshot) {
          effectivePackshot = fields.image_prompt.trim().slice(0, 3200);
          setPackshotPrompt(effectivePackshot);
        }
        if (Array.isArray(fields?.tags) && fields.tags.length && effectiveRosterTags.length < 4) {
          effectiveRosterTags = (fields.tags as string[]).map(String).slice(0, 24);
          setRosterTags(effectiveRosterTags);
        }
        if (Array.isArray(fields?.fantasy_starters)) {
          const normalized = normalizeFantasyStartersFromFields(fields.fantasy_starters);
          if (normalized.length && effectiveStartersVault.filter((s) => s.title.trim() && s.description.trim()).length < 2) {
            effectiveStartersVault = padFantasyStartersToFour(normalized, forgeName);
            setFantasyStartersVault(effectiveStartersVault);
          }
        }
        if (isAdmin) pushForgeOp("Design lab pass finished — chronicle / starters updated.", "ok");
      }

      const portraitAppearanceForRow = effectiveNarrative || appearanceBlurb;
      const rowGrokPrompt = composeForgePortraitPrompt({
        name: forgeName || "an original companion",
        bodyType,
        genderPresentation: gender,
        identityAnatomy: identityAnatomyDetail,
        ethnicitySeed: isOpenEthnicityChoice(ethnicity) ? undefined : normalizeForgeEthnicity(ethnicity),
        portraitAppearanceText: portraitAppearanceForRow,
        personalityLabel,
        vibeThemeLabel: "",
        artStyle,
        sceneAtmosphere,
        extraNotes,
        referenceNotes,
        wardrobeBrief: forgeVisualPortraitAddon(visualTailoring, forgePersonality),
      });
      const rowImagePrompt = rowGrokPrompt;

      const previewRaw = previewCanonicalUrl || previewUrl;
      let portraitUrl: string | null = stablePortraitDisplayUrl(previewRaw) ?? previewRaw;
      if (!portraitUrl) {
        if (isAdmin) pushForgeOp("No preview still — generating portrait from prompts (same as user flow)…", "info");
        const payload = buildPortraitGeneratePayload(effectiveNarrative || undefined);
        if (payload) {
          const portraitBody = {
            ...payload,
            prompt: effectivePackshot || rowImagePrompt,
          };
          const { data: genData, error: genErr } = await invokeGenerateImage(portraitBody);
          if (genErr) {
            toast.error(`Portrait: ${genErr.message}`);
          } else if (genData?.success && genData.imageUrl) {
            const canon = stablePortraitDisplayUrl(genData.publicImageUrl ?? genData.imageUrl) ?? genData.imageUrl;
            portraitUrl = canon;
            setPreviewUrl(stablePortraitDisplayUrl(genData.imageUrl) ?? genData.imageUrl);
            setPreviewCanonicalUrl(canon);
            if (isAdmin) pushForgeOp("Inline portrait generation finished.", "ok");
          }
        }
      } else {
        portraitUrl = stablePortraitDisplayUrl(portraitUrl) ?? portraitUrl;
        if (isAdmin) pushForgeOp("Using existing Live preview portrait for the row.", "info");
      }

      if (isAdmin) pushForgeOp("Inserting custom_characters row(s)…", "info");

      const nameReserve = await fetchForgeNameExclusions(supabase, userId);
      for (const k of nameGenSessionReserved.current) nameReserve.add(k);
      const batchFirstNames: string[] = [];
      if (batchCount === 1) {
        batchFirstNames.push(forgeName);
      } else {
        for (let j = 0; j < batchCount; j++) {
          const nm = await generateUniqueForgeName(
            supabase,
            userId,
            { gender, forgePersonality },
            nameReserve,
          );
          const nk = normalizeNameKey(nm);
          nameReserve.add(nk);
          nameGenSessionReserved.current.add(nk);
          batchFirstNames.push(nm);
        }
      }

      const defaultBioFor = (n: string) => {
        const anat = labelIdentityAnatomyForTags(identityAnatomyDetail);
        const anatSeg = anat ? ` ${anat}-anatomy presentation where it matters to the fantasy.` : "";
        return `${n} is a ${gender.toLowerCase()} presence${anatSeg} shaped by ${personalityLabel.toLowerCase()}, often imagined in ${sceneAtmosphere.toLowerCase()} light. ${tagline ? tagline + "." : ""} They move through the world with ${orientation.toLowerCase()} magnetism.`;
      };
      const defaultBio = defaultBioFor(forgeName);
      const bioOut = effectiveHook || defaultBio;
      const backstoryOut = effectiveChronicle || effectiveHook || bioOut;
      const appearanceOut = portraitAppearanceForRow;
      const tagsOutRaw = effectiveRosterTags.length
        ? effectiveRosterTags.slice(0, 12)
        : [
            ...forgePersonalityToArchetypeList(forgePersonality),
            artStyle,
            sceneAtmosphere,
            bodyType,
            ...combinedAccentSelections,
          ]
            .filter(Boolean)
            .slice(0, 12);
      const anatForTags = labelIdentityAnatomyForTags(identityAnatomyDetail);
      const tagsOut = [
        ...new Set(
          [...tagsOutRaw, gender, orientation, ...(anatForTags ? [anatForTags] : [])]
            .map((t) => String(t).trim())
            .filter((t) => t && t !== "—"),
        ),
      ].slice(0, 14);
      const kinksOut = rosterKinks.length ? rosterKinks.slice(0, 16) : [];
      const imagePromptOut = effectivePackshot || rowImagePrompt;

      const rows = [];
      for (let i = 0; i < batchCount; i++) {
        const rowFirst = batchFirstNames[i] ?? forgeName;
        const displayName = namePrefix.trim() ? `${namePrefix.trim()} ${rowFirst}`.trim() : rowFirst;
        const bioRow = effectiveHook || (batchCount > 1 ? defaultBioFor(rowFirst) : bioOut);
        const rowPersonality = `${personalityLabel}${extraNotes ? `. ${extraNotes}` : ""}`.trim();
        const basePrompt = buildSystemPromptFor(displayName);
        const charter = effectiveCharter || basePrompt;
        const goPublic = saveVisibility === "public" && !isAdmin;
        const startersForRow = padFantasyStartersToFour(effectiveStartersVault, displayName);
        const adminTier = adminAbyssalForge
          ? "abyssal"
          : normalizeCompanionRarity(adminForgeRarity);
        const rarityForTcg = isAdmin ? adminTier : "rare";
        const displayTraitsSeed = `${userId}|${displayName}|${i}`;
        rows.push({
          user_id: userId,
          name: displayName,
          personality: rowPersonality,
          personality_forge: {
            ...forgePersonality,
            _forgeThemeV1: buildForgeThemeSnapshotV1({
              activeForgeTab,
              forgeCardPose,
              artStyle,
              sceneAtmosphere,
              bodyType,
              visualTailoring,
              forgeTabFeatures,
              forgeTabSharedOverrides,
            }),
          },
          personality_archetypes: forgePersonalityToArchetypeList(forgePersonality),
          vibe_theme_selections: [],
          tagline: tagline || forgePersonality.personalityType,
          gender,
          identity_anatomy_detail: identityAnatomyDetail || null,
          orientation,
          role: forgePersonality.personalityType,
          tags: tagsOut,
          kinks: kinksOut,
          appearance: appearanceOut,
          bio: bioRow,
          backstory: backstoryOut,
          system_prompt: charter,
          fantasy_starters: startersForRow,
          gradient_from: "#7B2D8E",
          gradient_to: NEON,
          image_url: portraitUrl,
          image_prompt: imagePromptOut,
          is_public: isAdmin && forcePrivateForgeRef.current ? false : isAdmin ? true : goPublic,
          approved: isAdmin && forcePrivateForgeRef.current ? false : isAdmin ? true : goPublic,
          ...(isAdmin
            ? {
                rarity: adminTier,
                exclude_from_personal_vault: true,
              }
            : {}),
          avatar_url: portraitUrl,
          tcg_stats: generateTcgStatBlock(`${userId}:${displayName}:${i}:${batchCount}`, rarityForTcg),
          display_traits: serializeBaseDisplayTraitsForInsert({
            seed: displayTraitsSeed,
            tags: tagsOut,
            kinks: kinksOut,
            personality: rowPersonality,
            bio: bioRow,
            rarity: isAdmin ? adminTier : rarityForTcg,
          }),
        });
      }

      // Omit gallery_credit_name on insert: older DBs without that column (PGRST204) still work.
      let attemptRows = rows as Record<string, unknown>[];
      let insertRes = await supabase.from("custom_characters").insert(attemptRows).select("id");
      if (insertRes.error) {
        const msg = formatSupabaseError(insertRes.error);
        if (/personality_archetypes|vibe_theme_selections|personality_forge|PGRST204/i.test(msg)) {
          attemptRows = attemptRows.map((r) => {
            const { personality_archetypes: _a, vibe_theme_selections: _v, personality_forge: _p, ...rest } = r;
            return rest;
          });
          insertRes = await supabase.from("custom_characters").insert(attemptRows).select("id");
        }
      }
      if (insertRes.error) {
        const msg = formatSupabaseError(insertRes.error);
        if (/exclude_from_personal_vault|rarity|PGRST204/i.test(msg)) {
          attemptRows = attemptRows.map((r) => {
            const { exclude_from_personal_vault: _e, rarity: _r, ...rest } = r;
            return rest;
          });
          insertRes = await supabase.from("custom_characters").insert(attemptRows).select("id");
        }
      }
      if (insertRes.error) {
        const msg = formatSupabaseError(insertRes.error);
        if (/identity_anatomy_detail|PGRST204/i.test(msg)) {
          attemptRows = attemptRows.map((r) => {
            const { identity_anatomy_detail: _i, ...rest } = r;
            return rest;
          });
          insertRes = await supabase.from("custom_characters").insert(attemptRows).select("id");
        }
      }
      const { data: insertedRows, error } = insertRes;
      if (error) {
        if (!isAdmin) {
          const ref = await creditForgeCoins(
            finalTotalCost,
            "refund",
            "Forge: insert failed — refund",
            { reason: "insert_error" },
          );
          if (ref.ok) setTokens(ref.newBalance);
        }
        throw error;
      }

      const wantsGalleryCredit =
        !isAdmin &&
        saveVisibility === "public" &&
        creditUsername &&
        profileDisplayName.trim().length > 0 &&
        (insertedRows?.length ?? 0) > 0;
      if (wantsGalleryCredit && insertedRows?.length) {
        const credit = profileDisplayName.trim();
        const ids = insertedRows.map((r) => r.id).filter(Boolean);
        const { error: creditErr } = await supabase
          .from("custom_characters")
          .update({ gallery_credit_name: credit })
          .in("id", ids);
        if (creditErr) {
          const creditMsg = formatSupabaseError(creditErr);
          if (!/gallery_credit_name|PGRST204/i.test(creditMsg)) {
            toast.error(`Saved companion, but gallery credit failed: ${creditMsg}`);
          }
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: ["vault-collection"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
      if (insertedRows?.[0]?.id) {
        const ccFull = `cc-${String(insertedRows[0].id)}`;
        void invokeGenerateLiveCallOptions(ccFull, { skipCache: true }).catch(() => undefined);

        if (isAdmin) {
          setLastForgedCcId(ccFull);
          pushForgeOp(
            `Saved ${ccFull}. Open profile to review visuals, or chat to smoke-test behavior.`,
            "ok",
          );
        }

        setProfileLoopJob("queued");
        void (async () => {
          setProfileLoopJob("running");
          try {
            toast.info(isAdmin ? "Generating looping profile video…" : "Creating your looping portrait video…", {
              duration: 6000,
            });
            if (isAdmin) {
              pushForgeOp("Queued looping profile video (runs async; refresh Character management if needed).", "info");
            }
            const { data: vidData, error: vidErr } = await supabase.functions.invoke("generate-profile-loop-video", {
              body: { companionId: ccFull },
            });
            if (vidErr) throw new Error(await getEdgeFunctionInvokeMessage(vidErr, vidData));
            if ((vidData as { error?: string })?.error) throw new Error(String((vidData as { error?: string }).error));
            toast.success("Profile loop video saved — enable on profile if needed.");
            if (isAdmin) pushForgeOp("Profile loop video finished and saved.", "ok");
            setProfileLoopJob("done");
            void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
            void queryClient.invalidateQueries({ queryKey: ["companions"] });
          } catch (e) {
            console.error(e);
            setProfileLoopJob("error");
            if (isAdmin) {
              pushForgeOp(
                e instanceof Error
                  ? `Loop video: ${e.message.slice(0, 160)}…`
                  : "Loop video failed — retry from Character management.",
                "warn",
              );
            }
            toast.error(
              e instanceof Error
                ? `${e.message.slice(0, 220)}${isAdmin ? " — retry from Character management if needed." : " — open their profile → Live call tab is still ready; you can retry loop video from Character management if you have access."}`
                : "Loop video failed — try again from Character management or your profile tools.",
            );
          }
        })();
      }
      clearForgeSessionDraft(userId, isAdmin ? "admin" : "user");
      if (!isAdmin) {
        try {
          localStorage.removeItem(previewStorageKey(userId, "user"));
        } catch {
          /* ignore */
        }
        clearForgePreview({ silent: true });
      }
      if (isAdmin && onForged) onForged();
      else if (!embedded && mode === "user") navigate("/dashboard", { state: { activeNav: "collection" } });
    } catch (e: unknown) {
      if (isAdmin) pushForgeOp(formatSupabaseError(e), "err");
      toast.error(formatSupabaseError(e));
    } finally {
      endFinalForgeLoading();
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      async runRandomRouletteAndForge(opts?: { forcePrivate?: boolean }) {
        if (!isAdmin) return;
        pushForgeOp("Scheduled forge: spin the forge + create companion chain starting…", "info");
        forcePrivateForgeRef.current = Boolean(opts?.forcePrivate);
        try {
          await randomizeForgeCharacter();
          await new Promise((r) => setTimeout(r, 400));
          await runFinalCreate();
          pushForgeOp("Scheduled forge chain finished successfully.", "ok");
        } finally {
          forcePrivateForgeRef.current = false;
        }
      },
      runCelebrityParody: (celebritySeed: string, opts?: { grotesqueGpk?: boolean }) =>
        runCelebrityParodyFromAdmin(celebritySeed, opts),
    }),
    [isAdmin, runCelebrityParodyFromAdmin],
  );

  const panelClass =
    "rounded-2xl border border-white/[0.08] bg-black/45 backdrop-blur-2xl shadow-[0_0_60px_rgba(255,45,123,0.06),inset_0_1px_0_rgba(255,255,255,0.05)]";

  const PillGroup = ({
    label,
    options,
    value,
    onChange,
    cols = "grid-cols-2 sm:grid-cols-3",
    headerRight,
  }: {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
    cols?: string;
    headerRight?: ReactNode;
  }) => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        {headerRight}
      </div>
      <div className={cn("grid gap-2", cols)}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-xl border px-2.5 py-2.5 text-left text-xs sm:text-sm transition-all duration-200",
              value === opt
                ? "text-white border-[#FF2D7B]/50 bg-[#FF2D7B]/[0.12]"
                : "border-white/10 bg-black/35 text-muted-foreground hover:border-white/20 hover:text-foreground",
            )}
            style={
              value === opt
                ? { boxShadow: `0 0 24px ${NEON}22, inset 0 1px 0 rgba(255,255,255,0.06)` }
                : undefined
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const PERSONALITY_PILL_CONFIG: { key: ForgePersonalityKey; label: string; cols: string }[] = [
    { key: "timePeriod", label: "Time period / world setting", cols: "grid-cols-1 sm:grid-cols-2" },
    { key: "personalityType", label: "Personality type", cols: "grid-cols-1 sm:grid-cols-2" },
    { key: "speechStyle", label: "Speech style", cols: "grid-cols-1 sm:grid-cols-2" },
    { key: "sexualEnergy", label: "Sexual energy", cols: "grid-cols-1 sm:grid-cols-2" },
    { key: "relationshipVibe", label: "Relationship vibe", cols: "grid-cols-1 sm:grid-cols-2" },
  ];

  const setPersonalityPillar = (key: ForgePersonalityKey, value: string) => {
    setForgePersonality((prev) => ({ ...prev, [key]: value }));
  };

  const stashCurrentForge = useCallback(() => {
    const payload: ForgeStashPayload = {
      savedAt: new Date().toISOString(),
      name,
      namePrefix: namePrefix.trim() || undefined,
      tagline,
      gender,
      identityAnatomyDetail: identityAnatomyDetail || undefined,
      ethnicity: normalizeForgeEthnicity(ethnicity),
      forgePersonality: { ...forgePersonality },
      artStyle,
      sceneAtmosphere,
      bodyType,
      traits: [...traits],
      orientation,
      extraNotes,
      referenceNotes: referenceNotes.trim() || undefined,
      narrativeAppearance,
      chronicleBackstory,
      hookBio,
      charterSystemPrompt,
      packshotPrompt,
      rosterTags: [...rosterTags],
      rosterKinks: [...rosterKinks],
      fantasyStartersJson: JSON.stringify(fantasyStartersVault),
      previewUrl,
      previewCanonicalUrl,
      visualTailoring: { ...visualTailoring },
      activeForgeTab,
      forgeTabFeatures,
      forgeTabSharedOverrides,
      forgeCardPose,
    };
    saveForgeStash(payload);
    toast.success("Forge stashed on this device — switch ideas or restore anytime.");
  }, [
    name,
    namePrefix,
    tagline,
    gender,
    identityAnatomyDetail,
    ethnicity,
    forgePersonality,
    artStyle,
    sceneAtmosphere,
    bodyType,
    traits,
    orientation,
    extraNotes,
    referenceNotes,
    narrativeAppearance,
    chronicleBackstory,
    hookBio,
    charterSystemPrompt,
    packshotPrompt,
    rosterTags,
    rosterKinks,
    fantasyStartersVault,
    previewUrl,
    previewCanonicalUrl,
    visualTailoring,
    activeForgeTab,
    forgeTabFeatures,
    forgeTabSharedOverrides,
    forgeCardPose,
  ]);

  const restoreStashedForge = useCallback(() => {
    const p = loadForgeStash();
    if (!p) {
      toast.error("No stashed forge on this device.");
      return;
    }
    setName(p.name);
    setNamePrefix(p.namePrefix?.trim() ?? "");
    setTagline(p.tagline);
    setGender(p.gender);
    setIdentityAnatomyDetail(
      normalizeIdentityAnatomyDetail(
        typeof (p as { identityAnatomyDetail?: string }).identityAnatomyDetail === "string"
          ? (p as { identityAnatomyDetail?: string }).identityAnatomyDetail
          : undefined,
      ),
    );
    setEthnicity(normalizeForgeEthnicity(typeof p.ethnicity === "string" ? p.ethnicity : FORGE_ETHNICITY_ANY_LABEL));
    setForgePersonality(
      p.forgePersonality
        ? normalizeForgePersonality(p.forgePersonality)
        : DEFAULT_FORGE_PERSONALITY,
    );
    setVisualTailoring(normalizeForgeVisualTailoring(p.visualTailoring));
    setArtStyle(normalizeForgeArtStyle(p.artStyle));
    setSceneAtmosphere(normalizeForgeScene(p.sceneAtmosphere));
    setBodyType(normalizeForgeBodyType(p.bodyType));
    setTraits(p.traits?.length ? p.traits : pickRandom(TRAITS, randomTraitCount()));
    setOrientation(p.orientation);
    setExtraNotes(p.extraNotes ?? "");
    setReferenceNotes(p.referenceNotes?.trim() ?? "");
    setNarrativeAppearance(p.narrativeAppearance ?? "");
    setChronicleBackstory(p.chronicleBackstory ?? "");
    setHookBio(p.hookBio ?? "");
    setCharterSystemPrompt(p.charterSystemPrompt ?? "");
    setPackshotPrompt(p.packshotPrompt ?? "");
    setRosterTags(Array.isArray(p.rosterTags) ? p.rosterTags : []);
    setRosterKinks(Array.isArray(p.rosterKinks) ? p.rosterKinks : []);
    try {
      const st = JSON.parse(p.fantasyStartersJson || "[]") as { title: string; description: string }[];
      if (Array.isArray(st)) setFantasyStartersVault(st);
    } catch {
      /* ignore */
    }
    setPreviewUrl(p.previewUrl);
    setPreviewCanonicalUrl(p.previewCanonicalUrl);
    setActiveForgeTab(normalizeForgeThemeTabId(p.activeForgeTab));
    setForgeTabFeatures(normalizeForgeTabFeatureMap(p.forgeTabFeatures));
    setForgeTabSharedOverrides(normalizeForgeTabSharedOverrides(p.forgeTabSharedOverrides));
    setForgeCardPose(normalizeForgeCardPoseId(p.forgeCardPose));
    toast.success("Restored stashed forge.");
  }, []);

  function VisualSelectRow({
    label,
    field,
    options,
  }: {
    label: string;
    field: Exclude<keyof ForgeVisualTailoring, "specialFeatures">;
    options: readonly string[];
  }) {
    const value = String(visualTailoring[field]);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <ForgeFieldDice
            title={`Random: ${label}`}
            onRoll={() =>
              setVisualTailoring((v) => ({
                ...v,
                [field]: pick([...options]) as ForgeVisualTailoring[typeof field],
              }))
            }
          />
        </div>
        <Select value={value} onValueChange={(vv) => setVisualTailoring((v) => ({ ...v, [field]: vv }))}>
          <SelectTrigger className="w-full border-white/12 bg-black/40 text-white focus:ring-[hsl(170_100%_42%)]/40">
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,22rem)]">
            {options.map((opt) => (
              <SelectItem key={opt} value={opt} className="focus:bg-white/10 focus:text-white cursor-pointer">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  const shell = (
    <div
      className={cn(
        "relative font-sans text-foreground",
        embedded ? "min-h-0 flex flex-1 flex-col" : "min-h-screen bg-[#050508]",
      )}
    >
      {!embedded && <ParticleBackground />}
      {!embedded && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${NEON}0d 0%, transparent 35%, hsl(280 40% 8% / 0.4) 100%)`,
          }}
        />
      )}

      <div
        className={cn(
          "relative z-10",
          embedded
            ? "flex min-h-0 flex-1 flex-col px-0 py-0"
            : cn(
                "px-4 md:px-8 lg:px-10 py-5 md:py-7 pb-mobile-nav",
                !lgBreakpointUp && "max-lg:pb-[max(7.75rem,calc(5.75rem+env(safe-area-inset-bottom,0px)+2rem))]",
              ),
        )}
      >
        {!embedded && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 md:mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#FF2D7B] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div
          className={cn(
            "mx-auto flex min-h-0 max-w-[1700px] flex-col gap-5 lg:gap-7 lg:flex-row lg:items-stretch",
            embedded ? "lg:min-h-[420px] lg:h-[min(76dvh,800px)]" : "lg:min-h-[520px] lg:h-[calc(100dvh-8.5rem)]",
            embedded ? "min-h-0 flex-1" : "",
            !lgBreakpointUp && "max-lg:min-h-0 max-lg:flex-1",
          )}
        >
          {/* Controls — own scroll on lg+ so preview column never “releases” sticky and jumps */}
          <div
            className={cn(
              "order-2 flex w-full min-w-0 flex-col lg:order-1 lg:min-h-0 lg:flex-1",
              !lgBreakpointUp && forgeMobileView !== "controls" && "max-lg:hidden",
            )}
          >
            <div className="motion-reduce:scroll-auto space-y-4 overscroll-y-contain max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-2 lg:pr-2 [scrollbar-gutter:stable]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#FF2D7B]/90 mb-2">Forge Studio</p>
                <h1 className="font-gothic text-3xl md:text-4xl text-white tracking-wide flex items-center gap-3">
                  <Sparkles
                    className="h-8 w-8 shrink-0 motion-safe:animate-lf-drift"
                    style={{ color: NEON, filter: `drop-shadow(0 0 12px ${NEON})` }}
                  />
                  Companion Forge
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                  {isAdmin
                    ? "Admin forge — no token cost. Shape every variable, then commit."
                    : `Cheap live previews to iterate. Final binding costs ${FINAL_COST_PER} FC per companion.`}
                </p>
              </div>
              {!isAdmin && (
                <div
                  className="flex items-center gap-2.5 rounded-2xl border border-[#FF2D7B]/25 bg-black/50 px-5 py-3 backdrop-blur-md"
                  style={{ boxShadow: `0 0 28px ${NEON}15` }}
                >
                  <Coins className="h-5 w-5" style={{ color: NEON }} />
                  <span className="text-lg font-semibold tabular-nums text-white">{tokens ?? "—"}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">FC</span>
                </div>
              )}
            </div>

            {isAdmin && embedded ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground mr-1">Park this mix and start another:</span>
                <button
                  type="button"
                  onClick={() => stashCurrentForge()}
                  className="text-xs font-semibold rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/15"
                >
                  Stash draft
                </button>
                <button
                  type="button"
                  onClick={() => restoreStashedForge()}
                  className="text-xs font-semibold rounded-lg border border-white/15 px-3 py-1.5 text-foreground hover:bg-white/5 inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore stash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearForgeStash();
                    toast.info("Stash cleared.");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  Clear stash
                </button>
              </div>
            ) : null}

            <motion.button
              type="button"
              whileHover={{ scale: rouletteLoading ? 1 : 1.01 }}
              whileTap={{ scale: rouletteLoading ? 1 : 0.99 }}
              disabled={rouletteLoading}
              onClick={() => void randomizeForgeCharacter()}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 font-semibold text-white border border-white/10 disabled:opacity-55 disabled:pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${NEON}, hsl(280 48% 38%), hsl(170 55% 32%))`,
                boxShadow: `0 0 40px ${NEON}35, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              {rouletteLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />}
              {rouletteLoading
                ? isAdmin
                  ? "Writing local draft…"
                  : "The veil is spinning…"
                : "Spin the forge"}
            </motion.button>
            <p className="text-[10px] text-muted-foreground leading-relaxed -mt-2">
              {isAdmin
                ? "Draws a new mix from the same lists, locks a name, and fills copy + starters locally (no model round-trip) — edit the Narrative tab if you want a longer hand-written chronicle."
                : "Instant random roll: Personalities, scene, body, name, and a starter story pass — all from the forge’s own options, on your device."}
            </p>

            <AnimatePresence>
              {(profileLoopJob === "queued" ||
                profileLoopJob === "running" ||
                profileLoopJob === "done" ||
                profileLoopJob === "error") && (
                <motion.div
                  key={profileLoopJob}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-2",
                    profileLoopJob === "error"
                      ? "border-amber-500/35 bg-amber-500/10 text-amber-50"
                      : profileLoopJob === "done"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-50"
                        : "border-[#FF2D7B]/28 bg-[#FF2D7B]/[0.08] text-white",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {profileLoopJob === "running" || profileLoopJob === "queued" ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#FF2D7B]" />
                    ) : profileLoopJob === "done" ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <ScanEye className="h-4 w-4 shrink-0 text-amber-300" />
                    )}
                    <span className="font-medium leading-snug">
                      {profileLoopJob === "queued" && "Profile loop video queued…"}
                      {profileLoopJob === "running" && "Rendering your looping profile video…"}
                      {profileLoopJob === "done" && "Loop video saved — you can keep browsing the forge."}
                      {profileLoopJob === "error" && "Loop video hit a snag — retry from Character management when ready."}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/65 sm:ml-auto sm:text-right leading-snug">
                    Runs in the background after save — safe to plan your next character.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-2xl border border-white/[0.1] bg-black/35 p-3 sm:p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Forge focus tabs</p>
                  <p className="text-xs text-muted-foreground/85 mt-1">
                    Shared core fields stay below in the accordions — these tabs add theme DNA to prompts. Randomize per tab or
                    sync rendering when you are ready.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {activeForgeTab === "chaos" ? (
                    <button
                      type="button"
                      onClick={() => deepRandomizeForgeFocusTab({ wildChaos: true })}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#FF2D7B]/45 bg-[#FF2D7B]/12 px-3 py-1.5 text-[11px] font-medium text-[#ffb3d1] hover:bg-[#FF2D7B]/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Wild roll (all tabs + lab)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deepRandomizeForgeFocusTab({ wildChaos: false })}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] hover:bg-white/[0.04]"
                  >
                    <Dices className="h-3.5 w-3.5" />
                    Shuffle tab + lab + pose
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FORGE_THEME_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveForgeTab(tab.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition-colors",
                      activeForgeTab === tab.id
                        ? `${FORGE_TAB_BUTTON_ACCENT[tab.id]} text-white`
                        : "border-white/12 bg-black/30 text-foreground/85 hover:bg-white/[0.05]",
                    )}
                  >
                    <p className="text-xs font-semibold leading-tight">{tab.label}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{tab.subtitle}</p>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground/90 leading-snug">{forgeTabLiveSummary(activeForgeTab)}</p>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Card pose (all tabs)</p>
                    <p className="text-[11px] text-muted-foreground/85 mt-0.5">
                      Seated / low lounge only — always facing the lens. Applies to preview + save DNA for Nexus.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgeCardPose(randomForgeCardPose())}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/12 bg-black/45 px-2.5 py-1.5 text-[10px] hover:bg-white/[0.04]"
                  >
                    <Dices className="h-3 w-3" />
                    Random pose
                  </button>
                </div>
                <Select value={forgeCardPose} onValueChange={(v) => setForgeCardPose(normalizeForgeCardPoseId(v))}>
                  <SelectTrigger className="h-9 w-full border-white/12 bg-black/45 text-xs">
                    <SelectValue placeholder="Pose" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,20rem)]">
                    {FORGE_CARD_POSE_UI.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                onClick={applyActiveThemePreset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(170_100%_42%)]/40 bg-[hsl(170_100%_42%)]/10 px-3 py-2 text-[11px] font-medium text-[hsl(170_100%_75%)] hover:bg-[hsl(170_100%_42%)]/18 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Apply theme to rendering & wardrobe
              </button>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3 self-start w-full">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Shared field overrides</p>
                  <label className="flex items-center justify-between text-xs">
                    <span>Override body type in this tab</span>
                    <input
                      type="checkbox"
                      checked={activeTabShared.bodyTypeEnabled}
                      onChange={(e) =>
                        setForgeTabSharedOverrides((prev) => ({
                          ...prev,
                          [activeForgeTab]: { ...prev[activeForgeTab], bodyTypeEnabled: e.target.checked },
                        }))
                      }
                    />
                  </label>
                  {activeTabShared.bodyTypeEnabled ? (
                    <Select
                      value={activeTabShared.bodyTypeValue || bodyType}
                      onValueChange={(v) =>
                        setForgeTabSharedOverrides((prev) => ({
                          ...prev,
                          [activeForgeTab]: { ...prev[activeForgeTab], bodyTypeValue: v },
                        }))
                      }
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORGE_BODY_TYPES.map((bt) => (
                          <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  <label className="flex items-center justify-between text-xs">
                    <span>Override sexual energy</span>
                    <input
                      type="checkbox"
                      checked={activeTabShared.sexualEnergyEnabled}
                      onChange={(e) =>
                        setForgeTabSharedOverrides((prev) => ({
                          ...prev,
                          [activeForgeTab]: { ...prev[activeForgeTab], sexualEnergyEnabled: e.target.checked },
                        }))
                      }
                    />
                  </label>
                  {activeTabShared.sexualEnergyEnabled ? (
                    <input
                      value={activeTabShared.sexualEnergyValue}
                      onChange={(e) =>
                        setForgeTabSharedOverrides((prev) => ({
                          ...prev,
                          [activeForgeTab]: { ...prev[activeForgeTab], sexualEnergyValue: e.target.value },
                        }))
                      }
                      placeholder="e.g. Slow burn, primal, playful..."
                      className="h-9 w-full rounded-lg border border-white/12 bg-black/45 px-2 text-xs"
                    />
                  ) : null}

                  <label className="flex items-center justify-between text-xs">
                    <span>Override kinks (comma-separated)</span>
                    <input
                      type="checkbox"
                      checked={activeTabShared.kinksEnabled}
                      onChange={(e) =>
                        setForgeTabSharedOverrides((prev) => ({
                          ...prev,
                          [activeForgeTab]: { ...prev[activeForgeTab], kinksEnabled: e.target.checked },
                        }))
                      }
                    />
                  </label>
                  {activeTabShared.kinksEnabled ? (
                    <input
                      value={activeTabShared.kinksValue}
                      onChange={(e) =>
                        setForgeTabSharedOverrides((prev) => ({
                          ...prev,
                          [activeForgeTab]: { ...prev[activeForgeTab], kinksValue: e.target.value },
                        }))
                      }
                      placeholder="e.g. praise, restraint, teasing..."
                      className="h-9 w-full rounded-lg border border-white/12 bg-black/45 px-2 text-xs"
                    />
                  ) : null}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2 max-h-[min(52dvh,400px)] overflow-y-auto pr-1 self-start w-full min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground sticky top-0 bg-black/30 pb-2 z-[1]">
                    {FORGE_THEME_TABS.find((t) => t.id === activeForgeTab)?.label} controls
                  </p>
                  <ForgeThemeControls
                    activeTab={activeForgeTab}
                    features={forgeTabFeatures[activeForgeTab]}
                    onFeaturesChange={(next) =>
                      setForgeTabFeatures((prev) => ({ ...prev, [activeForgeTab]: next }))
                    }
                  />
                </div>
              </div>
            </div>

            <Accordion type="multiple" defaultValue={accordionDefaultOpen} className={cn(panelClass, "px-1")}>
              <AccordionItem value="identity" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Gender, identity & ancestry
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <PillGroup
                    label="Identity"
                    options={GENDERS}
                    value={gender}
                    onChange={setGender}
                    headerRight={<ForgeFieldDice title="Random gender" onRoll={() => setGender(pick(GENDERS))} />}
                  />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Anatomy (optional)
                      </p>
                      <ForgeFieldDice
                        title="Random anatomy"
                        onRoll={() =>
                          setIdentityAnatomyDetail(
                            (["", "pre_op", "post_op", "futa"] as const)[Math.floor(Math.random() * 4)] ?? "",
                          )
                        }
                      />
                    </div>
                    <Select
                      value={identityAnatomyDetail || "_none"}
                      onValueChange={(v) => setIdentityAnatomyDetail((v === "_none" ? "" : v) as IdentityAnatomyDetail)}
                    >
                      <SelectTrigger className="w-full max-w-md border-white/12 bg-black/40 text-white focus:ring-[#FF2D7B]/35">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,18rem)]">
                        {IDENTITY_ANATOMY_CHOICES.map((c) => (
                          <SelectItem
                            key={c.value || "_none"}
                            value={c.value === "" ? "_none" : c.value}
                            className="focus:bg-white/10 focus:text-white cursor-pointer"
                          >
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed max-w-md">
                      Adds a pre-op, post-op, or futa layer on top of whatever identity you pick — for consistent fantasy and
                      model prompts. Leave &quot;Not specified&quot; if you don’t need it.
                    </p>
                  </div>
                  <PillGroup
                    label="Orientation"
                    options={ORIENTATIONS}
                    value={orientation}
                    onChange={setOrientation}
                    cols="grid-cols-2 sm:grid-cols-3"
                    headerRight={<ForgeFieldDice title="Random orientation" onRoll={() => setOrientation(pick(ORIENTATIONS))} />}
                  />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Ancestry & complexion
                      </p>
                      <ForgeFieldDice title="Random ancestry seed" onRoll={() => setEthnicity(pick(ALL_FORGE_ETHNICITY_OPTIONS))} />
                    </div>
                    <Select
                      value={ethnicitySelectValue}
                      onValueChange={(v) => setEthnicity(normalizeForgeEthnicity(v))}
                    >
                      <SelectTrigger className="w-full max-w-md border-white/12 bg-black/40 text-white focus:ring-[#FF2D7B]/35">
                        <SelectValue placeholder="Choose a visual seed" />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,22rem)]">
                        {FORGE_ETHNICITY_GROUPS.map((group) => (
                          <SelectGroup key={group.id}>
                            <SelectLabel className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                              {group.label}
                            </SelectLabel>
                            {group.options.map((opt) => (
                              <SelectItem
                                key={`${group.id}-${opt}`}
                                value={opt}
                                className="focus:bg-white/10 focus:text-white cursor-pointer"
                              >
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                      Drives portrait face, skin tone, and hair texture. Fantasy picks are literal art direction.{" "}
                      <span className="text-white/70">{FORGE_ETHNICITY_ANY_LABEL}</span> leaves it to the model.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="personalities" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Personalities
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <div className="rounded-2xl border border-[#FF2D7B]/20 bg-gradient-to-br from-[#1a0a12]/90 to-black/50 p-4 sm:p-5 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff7eb3]/90">Personality &amp; voice</p>
                    <h3 className="font-gothic text-xl sm:text-2xl text-white leading-tight">Personalities</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                      Voice, flirt cadence, and relationship frame — separate from silhouette and wardrobe. Feeds Grok chat and
                      Live Call the same way it will for players.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                        One choice per row · five dimensions
                      </p>
                      <button
                        type="button"
                        onClick={() => setForgePersonality(randomForgePersonality())}
                        className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/15 bg-black/50 text-[hsl(170_100%_70%)] hover:border-[hsl(170_100%_42%)]/50 transition-colors"
                      >
                        {isAdmin ? "Randomize all" : "Shuffle the pillars"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {PERSONALITY_PILL_CONFIG.map(({ key, label, cols }) => (
                      <div
                        key={key}
                        className="rounded-xl border border-white/[0.07] bg-black/30 p-3 sm:p-4 space-y-3"
                      >
                        <PillGroup
                          label={label}
                          options={FORGE_PERSONALITY_BY_KEY[key]}
                          value={forgePersonality[key]}
                          onChange={(v) => setPersonalityPillar(key, v)}
                          cols={cols}
                          headerRight={
                            <ForgeFieldDice
                              title={`Random: ${label}`}
                              onRoll={() =>
                                setForgePersonality((prev) => ({
                                  ...prev,
                                  [key]: pick([...FORGE_PERSONALITY_BY_KEY[key]]),
                                }))
                              }
                            />
                          }
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="appearance" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Appearance
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <motion.div
                    initial={{ opacity: 0.85, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/50 to-[#1a0a14]/80 p-4 sm:p-5 space-y-2"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff7eb3]/85">Silhouette &amp; surface</p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                      Body type stays the silhouette anchor; the lab fields refine hair, skin, proportions, and surface reads for
                      portraits and prompts.
                    </p>
                  </motion.div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Body type</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-start gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</p>
                          <ForgeFieldDice
                            title="Random category"
                            onRoll={() => {
                              const g = pick(FORGE_BODY_GROUPS);
                              if (g.types?.length) setBodyType(normalizeForgeBodyType(g.types[0]!));
                            }}
                          />
                        </div>
                        <Select
                          value={bodyCategoryId}
                          onValueChange={(catId) => {
                            const g = FORGE_BODY_GROUPS.find((x) => x.id === catId);
                            if (g?.types?.length) setBodyType(normalizeForgeBodyType(g.types[0]!));
                          }}
                        >
                          <SelectTrigger className="w-full border-white/12 bg-black/40 text-white focus:ring-[hsl(170_100%_42%)]/40">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,22rem)]">
                            {FORGE_BODY_GROUPS.map((g) => (
                              <SelectItem
                                key={g.id}
                                value={g.id}
                                className="focus:bg-white/10 focus:text-white cursor-pointer"
                              >
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shape</p>
                          <ForgeFieldDice
                            title="Random shape in this category"
                            onRoll={() => {
                              if (bodyTypesInCategory.length)
                                setBodyType(normalizeForgeBodyType(pick(bodyTypesInCategory)));
                              else setBodyType(normalizeForgeBodyType(pick(FORGE_BODY_TYPES)));
                            }}
                          />
                        </div>
                        <Select
                          value={bodyTypeSelectValue}
                          onValueChange={(v) => setBodyType(normalizeForgeBodyType(v))}
                        >
                          <SelectTrigger className="w-full border-white/12 bg-black/40 text-white focus:ring-[hsl(170_100%_42%)]/40">
                            <SelectValue placeholder="Pick a body type" />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,22rem)]">
                            {bodyTypesInCategory.map((opt) => (
                              <SelectItem
                                key={opt}
                                value={opt}
                                className="focus:bg-white/10 focus:text-white cursor-pointer"
                              >
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Humanoid, anthro, hybrid, and non-human silhouettes — combine with rendering &amp; wardrobe; stay SFW and
                      respectful for compact-stature and mobility picks.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-start gap-4">
                    <VisualSelectRow label="Breast size" field="breastSize" options={FORGE_BREAST_SIZES} />
                    <VisualSelectRow label="Ass size" field="assSize" options={FORGE_ASS_SIZES} />
                    <VisualSelectRow label="Hair style" field="hairStyle" options={FORGE_HAIR_STYLES} />
                    <VisualSelectRow label="Hair color" field="hairColor" options={FORGE_HAIR_COLORS} />
                    <VisualSelectRow label="Eye color" field="eyeColor" options={FORGE_EYE_COLORS} />
                    <VisualSelectRow label="Skin tone" field="skinTone" options={FORGE_SKIN_TONES} />
                    <VisualSelectRow label="Height" field="height" options={FORGE_HEIGHTS} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Signature accents
                      </p>
                      <ForgeFieldDice
                        title="Random accent mix"
                        onRoll={() => {
                          const shuffled = [...APPEARANCE_ACCENT_OPTIONS]
                            .sort(() => Math.random() - 0.5)
                            .slice(0, 3 + Math.floor(Math.random() * 5));
                          setTraits(shuffled.filter((x) => TRAIT_SET.has(x)));
                          setVisualTailoring((v) => ({
                            ...v,
                            specialFeatures: shuffled.filter((x) => SPECIAL_FEATURE_SET.has(x)).slice(0, 8),
                          }));
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      A merged style layer for markings, anatomy cues, and fantasy signatures. Pick up to 8 accents.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {APPEARANCE_ACCENT_OPTIONS.map((accent) => {
                        const selected = combinedAccentSelections.includes(accent);
                        return (
                          <button
                            key={accent}
                            type="button"
                            onClick={() => toggleAppearanceAccent(accent)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs transition-all",
                              selected
                                ? "border-[hsl(170_100%_42%)]/50 bg-[hsl(170_100%_42%)]/10 text-[hsl(170_100%_75%)]"
                                : "border-white/12 bg-black/40 text-muted-foreground hover:border-white/25",
                            )}
                          >
                            {selected && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                            {accent}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="outfit" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Outfit &amp; aesthetic
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <motion.div
                    initial={{ opacity: 0.85, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                    className="rounded-2xl border border-[hsl(170_100%_42%)]/20 bg-black/40 p-4 space-y-2"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(170_100%_72%)]">
                      Smart outfit theme
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{smartOutfitTheme}</p>
                  </motion.div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-start gap-4">
                    <VisualSelectRow label="Default outfit style" field="outfitStyle" options={FORGE_OUTFIT_STYLES} />
                    <VisualSelectRow label="Color palette" field="colorPalette" options={FORGE_COLOR_PALETTES} />
                    <VisualSelectRow label="Footwear" field="footwear" options={FORGE_FOOTWEAR} />
                    <VisualSelectRow label="Accessories" field="accessories" options={FORGE_ACCESSORIES} />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    The outfit label stays the same (e.g. Bikini) but is re-costumed to your time period + personality — no
                    accidental modern beach defaults in medieval or mythic worlds.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rendering" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Art style &amp; scene
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-start gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Art style</p>
                        <ForgeFieldDice title="Random art style" onRoll={() => setArtStyle(normalizeForgeArtStyle(pick([...FORGE_ART_STYLES])))} />
                      </div>
                      <Select value={artStyle} onValueChange={(v) => setArtStyle(normalizeForgeArtStyle(v))}>
                        <SelectTrigger className="w-full border-white/12 bg-black/40 text-white focus:ring-[hsl(170_100%_42%)]/40">
                          <SelectValue placeholder="Art style" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,22rem)]">
                          {FORGE_ART_STYLES.map((opt) => (
                            <SelectItem
                              key={opt}
                              value={opt}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Scene &amp; atmosphere
                        </p>
                        <ForgeFieldDice
                          title="Random scene"
                          onRoll={() => setSceneAtmosphere(normalizeForgeScene(pick([...FORGE_SCENE_ATMOSPHERES])))}
                        />
                      </div>
                      <Select
                        value={sceneAtmosphere}
                        onValueChange={(v) => setSceneAtmosphere(normalizeForgeScene(v))}
                      >
                        <SelectTrigger className="w-full border-white/12 bg-black/40 text-white focus:ring-[hsl(170_100%_42%)]/40">
                          <SelectValue placeholder="Scene" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white max-h-[min(70vh,22rem)]">
                          {FORGE_SCENE_GROUPS.map((group) => (
                            <SelectGroup key={group.id}>
                              <SelectLabel className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                {group.label}
                              </SelectLabel>
                              {group.scenes.map((opt) => (
                                <SelectItem
                                  key={opt}
                                  value={opt}
                                  className="focus:bg-white/10 focus:text-white cursor-pointer"
                                >
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Lighting, lens, and set dressing — pair with the portrait prose tab; regenerate preview after big changes.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="narrative" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Literary draft &amp; portrait brief
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAdmin ? (
                      <>
                        Filled by <strong className="text-white/90">Spin the forge</strong> or the design-lab when your chronicle is
                        short. Edit freely
                      </>
                    ) : (
                      <>
                        Filled by <strong className="text-white/90">Spin the forge</strong> (a starter pass you can edit). This is what
                        saves
                      </>
                    )}{" "}
                    to your vault (appearance, bio, backstory, packshot prompt, chat charter). The{" "}
                    <strong className="text-white/90">profile card</strong> under Live preview mirrors these fields.
                  </p>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Cinematic appearance (prose)
                    </p>
                    <textarea
                      value={narrativeAppearance}
                      onChange={(e) => setNarrativeAppearance(e.target.value)}
                      rows={5}
                      placeholder="Flowing description — not a tag list…"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm resize-y focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Hook bio
                    </p>
                    <textarea
                      value={hookBio}
                      onChange={(e) => setHookBio(e.target.value)}
                      rows={3}
                      placeholder="Short elevator hook…"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm resize-y focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Chronicle backstory
                    </p>
                    <textarea
                      value={chronicleBackstory}
                      onChange={(e) => setChronicleBackstory(e.target.value)}
                      rows={8}
                      placeholder="3–4 paragraphs of premium lore…"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm resize-y focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      SFW packshot prompt
                      {isAdmin ? " (Grok / Imagine — pipeline)" : " (portrait engine)"}
                    </p>
                    <textarea
                      value={packshotPrompt}
                      onChange={(e) => setPackshotPrompt(e.target.value)}
                      rows={4}
                      placeholder="Dense cinematic portrait brief…"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm resize-y focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Chat charter (system prompt)
                    </p>
                    <textarea
                      value={charterSystemPrompt}
                      onChange={(e) => setCharterSystemPrompt(e.target.value)}
                      rows={6}
                      placeholder={isAdmin ? "Full persona rules (xAI / chat pipeline)…" : "Full persona rules for their chat voice…"}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm resize-y focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  {fantasyStartersVault.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-black/35 p-4 space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Fantasy starters ({fantasyStartersVault.length})
                      </p>
                      {fantasyStartersVault.map((s, i) => (
                        <div key={`${s.title}-${i}`} className="rounded-lg border border-white/10 bg-black/40 p-3 text-left">
                          <p className="text-xs font-semibold text-white">{s.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="reference" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Reference look (optional)
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload a mood image — we sample its palette so previews echo its colors and energy. Faces stay invented; this is not a
                    likeness pass.
                  </p>
                  <input
                    ref={referenceFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void onReferenceFileChosen(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => referenceFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[hsl(170_100%_42%)]/40 bg-[hsl(170_100%_42%)]/10 px-4 py-2.5 text-sm font-medium text-[hsl(170_100%_78%)] hover:bg-[hsl(170_100%_42%)]/15 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Upload image
                    </button>
                    {(referencePreviewUrl || referencePalette) && (
                      <button
                        type="button"
                        onClick={clearReferenceMaterial}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-muted-foreground hover:text-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear
                      </button>
                    )}
                  </div>
                  {referencePreviewUrl && (
                    <div className="rounded-lg border border-white/10 overflow-hidden w-28 h-28 bg-black/50">
                      <img src={referencePreviewUrl} alt="Reference" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Extra reference notes
                    </p>
                    <textarea
                      value={referenceNotes}
                      onChange={(e) => setReferenceNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. same rim light as ref, colder shadows, more latex sheen…"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="output" className={cn("border-white/10 px-4", !isAdmin && "border-b-0")}>
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Naming & batch
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">Name</p>
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isAdmin ? "Companion name (optional — auto if empty)" : "Companion name"}
                        className="w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                      />
                      <button
                        type="button"
                        onClick={() => void runGenerateNewName()}
                        disabled={nameGenBusy}
                        className={cn(
                          "shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all",
                          nameGenBusy
                            ? "border-white/10 bg-black/30 text-muted-foreground pointer-events-none opacity-60"
                            : "border-[#FF2D7B]/40 bg-[#FF2D7B]/10 text-white hover:border-[#FF2D7B]/60 hover:bg-[#FF2D7B]/15",
                        )}
                      >
                        {nameGenBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" style={{ color: NEON }} />}
                        <span>Generate new name</span>
                      </button>
                    </div>
                    {isAdmin && (
                      <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                        Admin forge: leave the name empty and the forge engine picks a unique name from the Personalities matrix
                        (and your existing companions) at create time.
                      </p>
                    )}
                    <input
                      value={namePrefix}
                      onChange={(e) => setNamePrefix(e.target.value)}
                      placeholder="Optional prefix (title / clan)"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">Tagline</p>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Short hook for cards"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Companions per forge
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {BATCH_PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setBatchPreset(n)}
                          className={cn(
                            "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                            batchPreset === n
                              ? "border-[#FF2D7B]/50 bg-[#FF2D7B]/10 text-white"
                              : "border-white/10 bg-black/40 text-muted-foreground hover:border-white/20",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBatchPreset(-1)}
                        className={cn(
                          "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                          batchPreset === -1
                            ? "border-[hsl(170_100%_42%/0.5)] text-[hsl(170_100%_75%)] bg-[hsl(170_100%_42%/0.1)]"
                            : "border-white/10 bg-black/40 text-muted-foreground hover:border-white/20",
                        )}
                      >
                        Custom
                      </button>
                    </div>
                    {batchPreset === -1 && (
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={batchCustom}
                        onChange={(e) => setBatchCustom(e.target.value)}
                        placeholder="1–25"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D7B]/40"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Extra notes for the model
                    </p>
                    <textarea
                      value={extraNotes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                      rows={3}
                      placeholder="Voice tics, limits, favorite scenarios…"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Gallery visibility</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSaveVisibility("private");
                          setCreditUsername(false);
                        }}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left text-xs transition-all flex items-start gap-2",
                          saveVisibility === "private"
                            ? "border-[#FF2D7B]/50 bg-[#FF2D7B]/10 text-white"
                            : "border-white/10 bg-black/30 text-muted-foreground hover:border-white/20",
                        )}
                      >
                        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          <span className="font-semibold block">Private</span>
                          <span className="text-[10px] opacity-80">Only you — not on the landing gallery</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveVisibility("public")}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left text-xs transition-all flex items-start gap-2",
                          saveVisibility === "public"
                            ? "border-[hsl(170_100%_42%)]/50 bg-[hsl(170_100%_42%)]/10 text-white"
                            : "border-white/10 bg-black/30 text-muted-foreground hover:border-white/20",
                        )}
                      >
                        <Globe className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(170_100%_50%)]" />
                        <span>
                          <span className="font-semibold block">Public gallery</span>
                          <span className="text-[10px] opacity-80">Listed for all visitors on the site</span>
                        </span>
                      </button>
                    </div>
                    {saveVisibility === "public" && !isAdmin && (
                      <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 cursor-pointer">
                        <span className="text-xs text-muted-foreground">
                          Credit my username on the card
                          {profileDisplayName ? (
                            <span className="block text-[10px] text-[hsl(170_100%_55%)] mt-0.5">Uses: {profileDisplayName}</span>
                          ) : (
                            <span className="block text-[10px] text-amber-500/90 mt-0.5">Set a username under Account first</span>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          checked={creditUsername}
                          onChange={(e) => setCreditUsername(e.target.checked)}
                          className="accent-[#FF2D7B] h-4 w-4 shrink-0"
                        />
                      </label>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {isAdmin && (
              <div className="rounded-2xl border border-[#FF2D7B]/25 bg-gradient-to-br from-[#2a0a18]/80 to-black/50 px-4 py-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/90">Admin · Discover card tier</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Forge is published to Discover. It stays out of your personal vault until you open the profile and save it
                  to your roster.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground flex-1 min-w-0">
                    <span className="uppercase tracking-wider text-[10px]">Rarity</span>
                    <select
                      value={adminForgeRarity}
                      disabled={adminAbyssalForge}
                      onChange={(e) =>
                        setAdminForgeRarity(e.target.value as Exclude<CompanionRarity, "abyssal">)
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-foreground disabled:opacity-45"
                    >
                      {COMPANION_RARITIES.filter((r) => r !== "abyssal").map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={adminAbyssalForge}
                      onChange={(e) => setAdminAbyssalForge(e.target.checked)}
                      className="accent-[#FF2D7B] mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-snug">
                      <span className="font-semibold text-foreground/90 block">Abyssal (super ultra rare)</span>
                      Overrides the dropdown — uses the Abyssal frame on the card.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {isAdmin && lastForgedCcId && (
              <AdminLoopingVideoBlock
                companionId={lastForgedCcId}
                onSuccess={() => {
                  void queryClient.invalidateQueries({ queryKey: ["companions"] });
                  void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
                }}
              />
            )}

            {isAdmin && (
              <details className="group rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/35 to-black/50 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 hover:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-100/95 min-w-0">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="truncate">Archetype parody lab (no celebrity names)</span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 space-y-3 border-t border-amber-500/20 pt-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Broad fictional genres / vibes only (no real people). Fills the same fields as{" "}
                    <strong className="text-white/90">Celebrity Parody</strong> at the top — then use{" "}
                    <strong className="text-white/90">Live preview</strong>.
                  </p>
                  <textarea
                    value={parodyArchetype}
                    onChange={(e) => setParodyArchetype(e.target.value)}
                    rows={3}
                    placeholder="e.g. “chaotic 90s supermodel energy”, “noir detective ham”…"
                    className="w-full rounded-xl border border-amber-500/20 bg-black/50 px-4 py-3 text-sm resize-none focus:outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={parodyLoading}
                    onClick={() => void runParodyLab()}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white border border-amber-500/35 disabled:opacity-45"
                    style={{
                      background: `linear-gradient(135deg, hsl(35 40% 22%), hsl(280 35% 28%))`,
                    }}
                  >
                    {parodyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    Generate archetype parody
                  </motion.button>
                </div>
              </details>
            )}
            </div>
          </div>

          {/* Preview — TCG-sized; lg+ shares row height with independent scroll (no sticky jump) */}
          <div
            className={cn(
              "order-1 flex w-full shrink-0 flex-col lg:order-2 lg:h-full lg:min-h-0 lg:w-[min(100%,380px)] xl:w-[400px]",
              !lgBreakpointUp && forgeMobileView !== "preview" && "max-lg:hidden",
            )}
          >
            <div className="motion-reduce:scroll-auto space-y-3 overscroll-y-contain max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pl-0.5 lg:pr-1 [scrollbar-gutter:stable]">
            <div
              className={cn(
                panelClass,
                "overflow-hidden motion-safe:transition-[box-shadow,transform] motion-safe:duration-500 motion-safe:ease-out motion-safe:hover:shadow-[0_0_72px_rgba(255,45,123,0.09)]",
              )}
            >
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="motion-safe:animate-lf-sway flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FF2D7B]/35 bg-gradient-to-br from-[#FF2D7B]/25 to-purple-900/40"
                    style={{ boxShadow: `0 0 20px ${NEON}22` }}
                  >
                    <ScanEye className="h-4 w-4 text-white" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Live preview</span>
                    <span className="text-[9px] text-muted-foreground/80 hidden sm:block">Portrait + profile card</span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewExpandOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-white hover:border-primary/35 transition-colors"
                      title="Expand portrait preview"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Expand
                    </button>
                  )}
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => clearForgePreview()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-white hover:border-white/25 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  )}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="w-full max-w-[min(100%,340px)] mx-auto lg:mx-0 overflow-visible p-2 max-sm:p-1.5">
                  <TierHaloPortraitFrame
                    variant="compact"
                    frameStyle="clean"
                    rarity={forgePreviewTier}
                    gradientFrom="#7B2D8E"
                    gradientTo={NEON}
                    rarityFrameBleed
                    className="overflow-visible"
                  >
                    <AnimatePresence mode="wait">
                      {previewUrl ? (
                        <motion.img
                          key={previewUrl}
                          initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                          src={previewUrl}
                          alt="Preview"
                          referrerPolicy="no-referrer"
                          onClick={() => setPreviewExpandOpen(true)}
                          className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover cursor-zoom-in outline-none ring-0"
                          title="Click to expand preview"
                          onError={() => {
                            toast.error("Preview image failed to load — check Storage bucket is public, then try Live preview again.");
                          }}
                        />
                      ) : (
                        <motion.div
                          key="grad"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 z-[1] flex flex-col justify-end p-3 sm:p-4"
                          style={{
                            background: `linear-gradient(160deg, #0a0508, ${NEON}44, hsl(280 40% 18%), hsl(170 25% 12%))`,
                          }}
                        >
                          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
                          <p className="text-[8px] uppercase tracking-[0.28em] text-white/55 mb-1 relative">Spec sheet</p>
                          <h2 className="font-gothic text-lg sm:text-xl text-white relative leading-tight drop-shadow-[0_0_16px_rgba(255,45,123,0.35)] line-clamp-2">
                            {name || "Unnamed desire"}
                          </h2>
                          <p className="text-[11px] text-white/75 italic mt-1 relative line-clamp-2">{tagline || "Your fantasy, forged live."}</p>
                          <div className="mt-2 flex flex-wrap gap-1 relative">
                            {[
                              gender,
                              ...(isOpenEthnicityChoice(ethnicity) ? [] : [normalizeForgeEthnicity(ethnicity)]),
                              artStyle,
                              sceneAtmosphere,
                              bodyType,
                              ...forgePersonalityToArchetypeList(forgePersonality).slice(0, 2),
                            ].map(
                              (x, i) => (
                                <span
                                  key={`${x}-${i}`}
                                  className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-white/90 max-w-[9rem] truncate"
                                >
                                  {x}
                                </span>
                              ),
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {previewLoading && (
                      <div className="absolute inset-0 z-[5] bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-10 w-10 animate-spin" style={{ color: NEON }} />
                        <p className="text-sm text-white/90">Forging your portrait…</p>
                      </div>
                    )}
                  </TierHaloPortraitFrame>
                </div>

                <div className="mt-3 rounded-xl border border-white/[0.12] bg-black/55 px-3 py-3 space-y-2">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Profile preview</p>
                  <p className="font-gothic text-lg sm:text-xl text-white leading-snug line-clamp-3">{name.trim() || "—"}</p>
                  <p className="text-[12px] sm:text-sm text-[#ffb8d9]/90 line-clamp-3">{tagline.trim() || "—"}</p>
                  <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed line-clamp-8 whitespace-pre-wrap">
                    {profilePreviewBlurb}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {forgePersonalityToArchetypeList(forgePersonality).map((x, i) => (
                      <span
                        key={`pv-${x}-${i}`}
                        className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/85 max-w-[10rem] truncate"
                      >
                        {x}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Portrait from prompts — then save companion */}
                <div className="mt-4 grid gap-2.5 grid-cols-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={previewLoading}
                    onClick={() => void runPreview()}
                    className="group flex min-h-[52px] items-center justify-start gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-45 disabled:pointer-events-none border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 42%))`,
                      boxShadow: `0 0 36px ${NEON}30, inset 0 1px 0 rgba(255,255,255,0.12)`,
                    }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25 border border-white/15 group-hover:border-white/25 transition-colors">
                      {previewLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Wand2 className="h-5 w-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]" />
                      )}
                    </span>
                    <span className="text-left leading-tight min-w-0">
                      <span className="block">Generate portrait</span>
                      <span className="block text-[10px] font-normal opacity-90">
                        Packshot prompt + fields below · {isAdmin ? "no FC" : `${PREVIEW_COST} FC preview`}
                      </span>
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={finalLoading || (!isAdmin && !name.trim())}
                    onClick={() => void runFinalCreate()}
                    className="group flex min-h-[52px] items-center justify-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none bg-black/40 text-[hsl(170_100%_78%)]"
                    style={{
                      borderColor: "hsl(170 100% 42% / 0.45)",
                      boxShadow: `0 0 28px hsl(170 100% 42% / 0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
                    }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(170_100%_42%)]/15 border border-[hsl(170_100%_42%)]/35 group-hover:bg-[hsl(170_100%_42%)]/25 transition-colors">
                      {finalLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[hsl(170_100%_70%)]" />
                      ) : (
                        <Gem className="h-5 w-5 text-[hsl(170_100%_65%)] drop-shadow-[0_0_10px_hsl(170_100%_50%/0.45)]" />
                      )}
                    </span>
                    <span className="text-left leading-tight min-w-0">
                      <span className="block">
                        Create {batchCount} companion{batchCount > 1 ? "s" : ""}
                      </span>
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {isAdmin ? "No FC spend · auto-name if empty" : `${FINAL_COST_PER} FC each · ${finalTotalCost} total`}
                      </span>
                    </span>
                  </motion.button>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Portrait prompt (image gen)</p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const bundle = {
                            composedPortraitPrompt: grokPrompt,
                            systemPrompt,
                            gender,
                            ethnicity: normalizeForgeEthnicity(ethnicity),
                            orientation,
                            forgePersonality,
                            artStyle,
                            sceneAtmosphere,
                            bodyType,
                            traits,
                            referencePalette,
                            referenceNotes: referenceNotes.trim() || undefined,
                          };
                          void navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
                        }}
                        className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(170_100%_55%)] hover:text-[hsl(170_100%_75%)]"
                      >
                        Copy JSON
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 sm:line-clamp-none">{grokPrompt}</p>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl border border-[hsl(170_100%_42%)]/20 bg-[hsl(170_100%_42%)]/[0.06] p-4 flex gap-3 items-start backdrop-blur-md"
              style={{ boxShadow: `0 0 40px hsl(170 100% 42% / 0.08)` }}
            >
              <ImageIcon className="h-5 w-5 shrink-0 mt-0.5 text-[hsl(170_100%_50%)]" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isAdmin ? (
                  <>
                    <strong className="text-white/90">Admin forge</strong> does not debit profiles.{" "}
                    <strong className="text-white/90">Celebrity Parody</strong> lives above the forge column; archetype-only parody is in
                    the collapsible at the bottom. Previews still hit xAI — keep batches reasonable.
                  </>
                ) : (
                  <>
                    Previews cost <strong style={{ color: NEON }}>{PREVIEW_COST} FC</strong> so you can iterate cheaply. Your last preview
                    image is remembered on this device until you forge or tap Reset. Final creation locks{" "}
                    <strong className="text-[hsl(170_100%_70%)]">{FINAL_COST_PER} FC</strong> per companion ({finalTotalCost} for this batch).
                    All generations follow SFW forge policy.
                  </>
                )}
              </p>
            </div>

            {isAdmin && (
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-950/35 to-black/60 p-4 space-y-3 backdrop-blur-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/95">Forge operator</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Session milestone log (not a live AI). Scheduled runs and portrait / create steps append here so you can glance away
                      and still see what finished.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgeOpLines([])}
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-white border border-white/10 rounded-lg px-2 py-1"
                  >
                    Clear
                  </button>
                </div>
                {finalLoading && forgeRunStartedAt != null && (
                  <p className="text-xs text-amber-200/95 tabular-nums">
                    Elapsed {Math.max(0, Math.floor((Date.now() - forgeRunStartedAt) / 1000))}s
                    <span className="sr-only">{forgeElapsedTick}</span>
                    <span className="text-muted-foreground font-normal"> · stay on this tab until the create step finishes</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={SITE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold uppercase tracking-wider rounded-lg border border-white/12 bg-black/40 px-2.5 py-1.5 text-violet-100 hover:border-violet-400/40"
                  >
                    Open site
                  </a>
                  <Link
                    to="/admin?section=characters"
                    className="text-[10px] font-semibold uppercase tracking-wider rounded-lg border border-white/12 bg-black/40 px-2.5 py-1.5 text-violet-100 hover:border-violet-400/40"
                  >
                    Character management
                  </Link>
                  {lastForgedCcId && (
                    <>
                      <Link
                        to={`/companions/${lastForgedCcId}`}
                        state={{ from: "/admin?section=characters" }}
                        className="text-[10px] font-semibold uppercase tracking-wider rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-2.5 py-1.5 text-emerald-100 hover:border-emerald-400/50"
                      >
                        Last forged · profile
                      </Link>
                      <Link
                        to={`/chat/${lastForgedCcId}`}
                        state={{ from: "/admin?section=characters" }}
                        className="text-[10px] font-semibold uppercase tracking-wider rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-2.5 py-1.5 text-emerald-100 hover:border-emerald-400/50"
                      >
                        Last forged · chat
                      </Link>
                    </>
                  )}
                </div>
                <div
                  ref={forgeOpScrollRef}
                  className="max-h-[220px] overflow-y-auto rounded-xl border border-white/10 bg-black/50 p-3 space-y-2 text-left"
                >
                  {forgeOpLines.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No events yet — spin the forge, portrait, or create companion.</p>
                  ) : (
                    forgeOpLines.map((line) => (
                      <div
                        key={line.id}
                        className={cn(
                          "rounded-lg border px-2.5 py-2 text-[11px] leading-snug",
                          line.kind === "ok" && "border-emerald-500/30 bg-emerald-950/25 text-emerald-50/95",
                          line.kind === "warn" && "border-amber-500/35 bg-amber-950/25 text-amber-50/95",
                          line.kind === "err" && "border-red-500/35 bg-red-950/30 text-red-50/95",
                          line.kind === "info" && "border-white/10 bg-black/40 text-white/85",
                        )}
                      >
                        <span className="text-[9px] font-mono text-muted-foreground/90">
                          {new Date(line.t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span className="block mt-0.5 whitespace-pre-wrap">{line.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {!lgBreakpointUp ? (
          <nav
            className="lg:hidden pointer-events-none fixed inset-x-0 bottom-0 z-[60] border-t border-white/[0.08] bg-[#050508]/95 px-3 pt-2 pb-[max(5.75rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))] backdrop-blur-xl"
            aria-label="Forge view"
          >
            <div className="pointer-events-auto mx-auto flex max-w-lg gap-2">
              <button
                type="button"
                onClick={() => setForgeMobileView("controls")}
                className={cn(
                  "flex min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
                  forgeMobileView === "controls"
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-white/10 bg-black/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <Wand2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Controls
              </button>
              <button
                type="button"
                onClick={() => setForgeMobileView("preview")}
                className={cn(
                  "flex min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
                  forgeMobileView === "preview"
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-white/10 bg-black/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <ScanEye className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Preview
              </button>
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {shell}
      <Dialog open={previewExpandOpen} onOpenChange={setPreviewExpandOpen}>
        <DialogContent className="max-w-[min(96vw,560px)] border-white/10 bg-[#0a0810]/95 text-foreground">
          <DialogHeader>
            <DialogTitle className="font-gothic text-lg">Portrait preview</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative w-full max-h-[min(70vh,640px)] overflow-hidden rounded-xl border border-white/10 bg-black/60">
                <img src={previewUrl} alt="" className="w-full h-full max-h-[min(70vh,640px)] object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                <p className="font-gothic text-xl text-white">{name.trim() || "—"}</p>
                <p className="text-sm text-[#ffb8d9]/90">{tagline.trim() || "—"}</p>
                <p className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{profilePreviewBlurb}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
});

export default CompanionCreator;
