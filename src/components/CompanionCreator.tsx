import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Coins,
  Dices,
  Flame,
  Loader2,
  Sparkles,
  Wand2,
  ImageIcon,
  Check,
  Globe,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { invokeGenerateImage } from "@/lib/invokeGenerateImage";
import { formatSupabaseError } from "@/lib/supabaseError";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";
const PREVIEW_COST = 50;
const FINAL_COST_PER = 250;

export type CompanionCreatorMode = "user" | "admin";

export interface CompanionCreatorProps {
  mode?: CompanionCreatorMode;
  embedded?: boolean;
  /** Admin: called after a successful forge so parent can switch tabs (e.g. Character management). */
  onForged?: () => void;
}

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

const PERSONALITIES = [
  "Dominant",
  "Submissive",
  "Switch",
  "Bratty",
  "Gentle",
  "Yandere",
  "Himbo / Bimbo",
  "Gremlin",
  "Sadistic (consensual)",
  "Caring Mommy",
  "Caring Daddy",
  "Teasing",
  "Shy",
  "Chaotic",
  "Romantic",
  "Possessive",
  "Playful",
  "Dark & brooding",
  "Wholesome → filthy",
  "Stoic",
  "Hedonist",
  "Primal",
  "Service top",
  "Power bottom",
] as const;

const VIBES = [
  "Goth",
  "Cyberpunk",
  "High fantasy",
  "Sci-fi",
  "Horror",
  "Medieval",
  "Modern luxury",
  "Anime",
  "Monster / Demi-human",
  "Alien",
  "Pirate",
  "Vampire",
  "Witch / Warlock",
  "Succubus / Incubus",
  "Noir detective",
  "Rave / festival",
  "Victorian",
  "Desert wasteland",
  "Deep sea",
  "Angelic",
] as const;

const ART_STYLES = [
  "Photorealistic",
  "Anime",
  "3D render",
  "Comic / graphic novel",
  "Oil painting",
  "Cyber-goth digital",
  "Watercolor",
  "Neon airbrush",
  "Low-poly stylized",
  "Baroque portrait",
] as const;

const BODY_TYPES = [
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
] as const;

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

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export default function CompanionCreator({ mode = "user", embedded = false, onForged }: CompanionCreatorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = mode === "admin";

  const [userId, setUserId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [name, setName] = useState("");
  const [namePrefix, setNamePrefix] = useState("");
  const [tagline, setTagline] = useState("");
  const [gender, setGender] = useState<string>(GENDERS[0]!);
  const [personality, setPersonality] = useState<string>(PERSONALITIES[0]!);
  const [vibe, setVibe] = useState<string>(VIBES[0]!);
  const [theme, setTheme] = useState("");
  const [artStyle, setArtStyle] = useState<string>(ART_STYLES[0]!);
  const [bodyType, setBodyType] = useState<string>(BODY_TYPES[2]!);
  const [traits, setTraits] = useState<string[]>(["Tattoos", "Piercings"]);
  const [orientation, setOrientation] = useState<string>(ORIENTATIONS[0]!);
  const [extraNotes, setExtraNotes] = useState("");
  const [batchPreset, setBatchPreset] = useState<number>(1);
  const [batchCustom, setBatchCustom] = useState("");
  /** Only your collection — not listed on the landing gallery */
  const [saveVisibility, setSaveVisibility] = useState<"private" | "public">("private");
  /** When public, optionally show Account display name on the gallery card */
  const [creditUsername, setCreditUsername] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);

  const batchCount = useMemo(() => {
    if (batchPreset === -1) {
      const n = parseInt(batchCustom, 10);
      return Number.isFinite(n) && n >= 1 && n <= 25 ? n : 1;
    }
    return batchPreset;
  }, [batchPreset, batchCustom]);

  const finalTotalCost = FINAL_COST_PER * batchCount;

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

  const appearanceBlurb = useMemo(() => {
    const t = traits.length ? traits.join(", ") : "no listed special traits";
    return `${bodyType} build; ${gender}; ${artStyle} look; ${t}. Overall ${vibe} mood${theme ? ` — ${theme}` : ""}. ${extraNotes}`.trim();
  }, [traits, bodyType, gender, artStyle, vibe, theme, extraNotes]);

  const grokPrompt = useMemo(() => {
    return [
      `Portrait of ${name || "an original companion"}: ${appearanceBlurb}.`,
      `Personality energy: ${personality}.`,
      `Setting / aesthetic: ${vibe}${theme ? `, ${theme}` : ""}.`,
      `Render in ${artStyle} style, premium seductive SFW pin-up / romance cover quality.`,
      extraNotes ? `Notes: ${extraNotes}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [name, appearanceBlurb, personality, vibe, theme, artStyle, extraNotes]);

  const systemPrompt = useMemo(() => {
    return `You are ${name || "a custom AI companion"}, ${gender.toLowerCase()}, ${orientation}. Archetype: ${personality}. Visual & vibe: ${vibe}${theme ? ` (${theme})` : ""}, ${artStyle} aesthetic, ${bodyType} body, notable traits: ${traits.join(", ") || "none specified"}.

Speak and act consistently with this persona. Stay immersive; respect safe words immediately. When toy control fits the scene and the user consents, you may end messages with: {"lovense_command":{"command":"vibrate","intensity":0-20,"duration":5000}}.

User flavor notes: ${extraNotes || "none"}`;
  }, [name, gender, orientation, personality, vibe, theme, artStyle, bodyType, traits, extraNotes]);

  const deductTokens = async (amount: number): Promise<boolean> => {
    if (isAdmin) return true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const { data: row, error: rErr } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", session.user.id)
      .single();
    if (rErr || !row) return false;
    if (row.tokens_balance < amount) return false;
    const { error: uErr } = await supabase
      .from("profiles")
      .update({ tokens_balance: row.tokens_balance - amount })
      .eq("user_id", session.user.id);
    if (uErr) return false;
    setTokens(row.tokens_balance - amount);
    return true;
  };

  const addTokens = async (amount: number): Promise<void> => {
    if (isAdmin) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data: row } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", session.user.id)
      .single();
    if (!row) return;
    const next = row.tokens_balance + amount;
    await supabase.from("profiles").update({ tokens_balance: next }).eq("user_id", session.user.id);
    setTokens(next);
  };

  const randomizeAll = () => {
    setGender(pick(GENDERS));
    setPersonality(pick(PERSONALITIES));
    setVibe(pick(VIBES));
    setTheme(
      ["neon cathedral", "acid rain alley", "obsidian ballroom", "orbital spa", "cursed library"][
        Math.floor(Math.random() * 5)
      ]!,
    );
    setArtStyle(pick(ART_STYLES));
    setBodyType(pick(BODY_TYPES));
    const shuffled = [...TRAITS].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 4));
    setTraits(shuffled);
    setOrientation(pick(ORIENTATIONS));
    const prefixes = ["Nyx", "Vex", "Rune", "Sable", "Zephyr", "Marrow", "Lux", "Hex"];
    setNamePrefix(pick(prefixes));
    setName(`${pick(prefixes)} ${pick(["Vale", "Noct", "Drift", "Quill", "Fable"])}`);
    setTagline(
      pick(["Whispers behind velvet rope", "Your glitch in the matrix", "Built from desire & code", "Dangerously attentive"]),
    );
    toast.success("Roulette — new DNA spun.");
  };

  const toggleTrait = (t: string) => {
    setTraits((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const runPreview = async () => {
    if (!userId) return;
    if (!isAdmin) {
      if (tokens !== null && tokens < PREVIEW_COST) {
        toast.error(`Need ${PREVIEW_COST} tokens for preview.`);
        return;
      }
      const reserved = await deductTokens(PREVIEW_COST);
      if (!reserved) {
        toast.error("Could not reserve preview tokens.");
        return;
      }
    }
    setPreviewLoading(true);
    try {
      const previewBody = {
        prompt: grokPrompt,
        userId,
        isPortrait: true,
        name: name || "Custom Companion",
        subtitle: tagline || "LustForge forged",
        characterData: {
          style: artStyle.toLowerCase().replace(/\s+/g, "-"),
          randomize: false,
          bodyType,
          vibe: `${vibe}. ${theme}`.trim(),
          hair: `styled to match ${vibe} and ${artStyle}`,
          eyes: traits.includes("Glowing eyes") ? "striking glowing eyes" : "expressive, magnetic eyes",
          clothing: `${vibe} fashion, luxurious textures, ${artStyle} presentation`,
          expression: `${personality} energy`,
          ethnicity: "any",
          ageRange: "young adult",
          pose: "three-quarter portrait, alluring confident pose",
          baseDescription: `an original seductive character, ${gender}, ${bodyType}, ${traits.join(", ") || "clean aesthetic"}`,
        },
      };

      const { data, error } = await invokeGenerateImage(previewBody);
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      if (!data.imageUrl) throw new Error("No image URL returned");
      setPreviewUrl(data.imageUrl);
      toast.success(isAdmin ? "Preview forged (admin)." : `Preview saved · −${PREVIEW_COST} tokens`);
    } catch (e: unknown) {
      if (!isAdmin) await addTokens(PREVIEW_COST);
      const msg = e instanceof Error ? e.message : "Preview failed";
      toast.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runFinalCreate = async () => {
    if (!userId) return;
    if (!name.trim()) {
      toast.error("Name your companion before forging.");
      return;
    }
    if (!isAdmin && saveVisibility === "public" && creditUsername && !profileDisplayName.trim()) {
      toast.error("Add a display username in Account settings to credit yourself on the public gallery.");
      return;
    }
    if (!isAdmin) {
      if (tokens !== null && tokens < finalTotalCost) {
        toast.error(`Need ${finalTotalCost} tokens for ${batchCount} companion(s).`);
        return;
      }
    }
    setFinalLoading(true);
    try {
      const ok = await deductTokens(finalTotalCost);
      if (!isAdmin && !ok) {
        toast.error("Insufficient tokens.");
        setFinalLoading(false);
        return;
      }

      const bio = `${name} is a ${personality.toLowerCase()} ${gender.toLowerCase()} presence wrapped in ${vibe.toLowerCase()} aesthetics. ${tagline ? tagline + "." : ""} They move through the world with ${orientation.toLowerCase()} magnetism.`;
      const rows = [];
      for (let i = 0; i < batchCount; i++) {
        const suffix = batchCount > 1 ? ` ${i + 1}` : "";
        const displayName = namePrefix.trim() ? `${namePrefix.trim()} ${name.trim()}${suffix}`.trim() : `${name.trim()}${suffix}`;
        const basePrompt = systemPrompt.replaceAll(name.trim(), displayName);
        const goPublic = saveVisibility === "public" && !isAdmin;
        rows.push({
          user_id: userId,
          name: displayName,
          personality: `${personality}. ${extraNotes}`.trim(),
          tagline: tagline || `${vibe} · ${personality}`,
          gender,
          orientation,
          role: personality,
          tags: [vibe, artStyle, bodyType, ...traits].slice(0, 12),
          kinks: [],
          appearance: appearanceBlurb,
          bio,
          system_prompt: basePrompt,
          fantasy_starters: [],
          gradient_from: "#7B2D8E",
          gradient_to: NEON,
          image_url: previewUrl,
          image_prompt: grokPrompt,
          is_public: goPublic,
          approved: goPublic,
          avatar_url: previewUrl,
        });
      }

      // Omit gallery_credit_name on insert: older DBs without that column (PGRST204) still work.
      const { data: insertedRows, error } = await supabase.from("custom_characters").insert(rows).select("id");
      if (error) {
        if (!isAdmin) await addTokens(finalTotalCost);
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
      toast.success(
        batchCount === 1
          ? saveVisibility === "public" && !isAdmin
            ? "Companion forged — live on the public gallery."
            : isAdmin
              ? "Companion saved — see Community forge below."
              : "Companion bound to your vault."
          : `${batchCount} companions forged.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
      if (isAdmin && onForged) onForged();
      else if (!embedded && mode === "user") navigate("/dashboard", { state: { activeNav: "collection" } });
    } catch (e: unknown) {
      toast.error(formatSupabaseError(e));
    } finally {
      setFinalLoading(false);
    }
  };

  const panelClass =
    "rounded-2xl border border-white/[0.08] bg-black/45 backdrop-blur-2xl shadow-[0_0_60px_rgba(255,45,123,0.06),inset_0_1px_0_rgba(255,255,255,0.05)]";

  const PillGroup = ({
    label,
    options,
    value,
    onChange,
    cols = "grid-cols-2 sm:grid-cols-3",
  }: {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
    cols?: string;
  }) => (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
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

  if (loadingProfile) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  const shell = (
    <div className={cn("relative font-sans text-foreground", embedded ? "min-h-0" : "min-h-screen bg-[#050508]")}>
      {!embedded && <ParticleBackground />}
      {!embedded && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${NEON}0d 0%, transparent 35%, hsl(280 40% 8% / 0.4) 100%)`,
          }}
        />
      )}

      <div className={cn("relative z-10", embedded ? "px-0 py-0" : "px-4 md:px-10 py-10")}>
        {!embedded && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#FF2D7B] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 max-w-[1700px] mx-auto">
          {/* Controls — scrolls independently on desktop while preview stays pinned */}
          <div className="order-2 lg:order-1 w-full lg:flex-1 lg:min-w-0 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-2 lg:pb-4 overscroll-contain space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#FF2D7B]/90 mb-2">Forge Studio</p>
                <h1 className="font-gothic text-3xl md:text-4xl text-white tracking-wide flex items-center gap-3">
                  <Sparkles className="h-8 w-8 shrink-0" style={{ color: NEON, filter: `drop-shadow(0 0 12px ${NEON})` }} />
                  Companion Forge
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                  {isAdmin
                    ? "Admin forge — no token cost. Shape every variable, then commit."
                    : "Cheap live previews to iterate. Final binding costs 250 tokens per companion."}
                </p>
              </div>
              {!isAdmin && (
                <div
                  className="flex items-center gap-2.5 rounded-2xl border border-[#FF2D7B]/25 bg-black/50 px-5 py-3 backdrop-blur-md"
                  style={{ boxShadow: `0 0 28px ${NEON}15` }}
                >
                  <Coins className="h-5 w-5" style={{ color: NEON }} />
                  <span className="text-lg font-semibold tabular-nums text-white">{tokens ?? "—"}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">tokens</span>
                </div>
              )}
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={randomizeAll}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 font-semibold text-white border border-white/10"
              style={{
                background: `linear-gradient(135deg, ${NEON}, hsl(280 48% 38%), hsl(170 55% 32%))`,
                boxShadow: `0 0 40px ${NEON}35, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              <Dices className="h-5 w-5" />
              Randomize / Roulette
            </motion.button>

            <Accordion
              type="multiple"
              defaultValue={["identity", "personality", "world", "body", "output"]}
              className={cn(panelClass, "px-1")}
            >
              <AccordionItem value="identity" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Gender & identity
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <PillGroup label="Identity" options={GENDERS} value={gender} onChange={setGender} />
                  <PillGroup
                    label="Orientation"
                    options={ORIENTATIONS}
                    value={orientation}
                    onChange={setOrientation}
                    cols="grid-cols-2 sm:grid-cols-3"
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="personality" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Personality archetype
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <PillGroup
                    label="Archetype"
                    options={PERSONALITIES}
                    value={personality}
                    onChange={setPersonality}
                    cols="grid-cols-2 sm:grid-cols-2"
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="world" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Vibe & theme
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <PillGroup label="Vibe" options={VIBES} value={vibe} onChange={setVibe} cols="grid-cols-2 sm:grid-cols-2" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Theme / setting (optional)
                    </p>
                    <input
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="e.g. rain-slick rooftop, velvet VIP lounge…"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="body" className="border-white/10 px-4">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Art style & body
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <PillGroup label="Art style" options={ART_STYLES} value={artStyle} onChange={setArtStyle} />
                  <PillGroup label="Body type" options={BODY_TYPES} value={bodyType} onChange={setBodyType} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Special traits
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TRAITS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTrait(t)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition-all",
                            traits.includes(t)
                              ? "border-[hsl(170_100%_42%)]/50 bg-[hsl(170_100%_42%)]/10 text-[hsl(170_100%_75%)]"
                              : "border-white/12 bg-black/40 text-muted-foreground hover:border-white/25",
                          )}
                        >
                          {traits.includes(t) && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="output" className="border-white/10 px-4 border-b-0">
                <AccordionTrigger className="font-gothic text-lg text-white hover:no-underline py-4">
                  Naming & batch
                </AccordionTrigger>
                <AccordionContent className="pb-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">Name</p>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Companion name"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm mb-2 focus:outline-none focus:border-[#FF2D7B]/40 focus:ring-2 focus:ring-[#FF2D7B]/15"
                    />
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
          </div>

          {/* Preview — TCG-sized (~63×88mm), sticky right on desktop; on mobile shown above options */}
          <div className="order-1 lg:order-2 w-full lg:w-[276px] xl:w-[288px] shrink-0 lg:sticky lg:top-20 lg:self-start space-y-4">
            <div className={cn(panelClass, "overflow-hidden")}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Live preview
                </span>
                <span className="text-[9px] text-muted-foreground/80 hidden sm:inline">TCG · pins while you scroll</span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="relative aspect-[63/88] w-full max-w-[252px] mx-auto lg:mx-0 rounded-xl overflow-hidden border border-[#FF2D7B]/25 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                  <AnimatePresence mode="wait">
                    {previewUrl ? (
                      <motion.img
                        key="img"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        src={previewUrl}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <motion.div
                        key="grad"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4"
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
                          {[gender, personality, vibe, artStyle, bodyType].map((x) => (
                            <span
                              key={x}
                              className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-white/90 max-w-[9rem] truncate"
                            >
                              {x}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {previewLoading && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin" style={{ color: NEON }} />
                      <p className="text-sm text-white/90">Forging your portrait…</p>
                    </div>
                  )}
                </div>

                {/* Generate actions directly under preview */}
                <div className="mt-4 grid gap-2.5 grid-cols-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={previewLoading}
                    onClick={() => void runPreview()}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-45 disabled:pointer-events-none border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 42%))`,
                      boxShadow: `0 0 36px ${NEON}30, inset 0 1px 0 rgba(255,255,255,0.12)`,
                    }}
                  >
                    {previewLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                    <span className="text-left leading-tight">
                      Live preview
                      <span className="block text-[10px] font-normal opacity-90">
                        {isAdmin ? "Free" : `${PREVIEW_COST} tokens`}
                      </span>
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={finalLoading || !name.trim()}
                    onClick={() => void runFinalCreate()}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none bg-black/40 text-[hsl(170_100%_78%)]"
                    style={{
                      borderColor: "hsl(170 100% 42% / 0.45)",
                      boxShadow: `0 0 28px hsl(170 100% 42% / 0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
                    }}
                  >
                    {finalLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flame className="h-5 w-5 text-[hsl(170_100%_50%)]" />}
                    <span className="text-left leading-tight">
                      Create {batchCount} companion{batchCount > 1 ? "s" : ""}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {isAdmin ? "Free" : `${FINAL_COST_PER} tokens each · ${finalTotalCost} total`}
                      </span>
                    </span>
                  </motion.button>
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Prompt snapshot</p>
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
                Previews cost <strong style={{ color: NEON }}>{PREVIEW_COST} tokens</strong> so you can iterate cheaply. Final creation locks{" "}
                <strong className="text-[hsl(170_100%_70%)]">{FINAL_COST_PER} tokens</strong> per companion ({finalTotalCost} for this batch). All
                generations follow SFW forge policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return shell;
}
