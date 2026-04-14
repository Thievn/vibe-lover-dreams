import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";
const PREVIEW_COST = 50;
const FINAL_COST_PER = 250;

export type CompanionCreatorMode = "user" | "admin";

export interface CompanionCreatorProps {
  /** User flow deducts tokens; admin skips billing. */
  mode?: CompanionCreatorMode;
  /** Hide back link + outer chrome when embedded in admin. */
  embedded?: boolean;
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

export default function CompanionCreator({ mode = "user", embedded = false }: CompanionCreatorProps) {
  const navigate = useNavigate();
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
  const [isPublic, setIsPublic] = useState(false);

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
    const { data: { session } } = await supabase.auth.getSession();
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
      .select("tokens_balance")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) console.error(error);
    setTokens(data?.tokens_balance ?? 100);
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
    const { data: { session } } = await supabase.auth.getSession();
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
    const { data: { session } } = await supabase.auth.getSession();
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
    setTheme(["neon cathedral", "acid rain alley", "obsidian ballroom", "orbital spa", "cursed library"][Math.floor(Math.random() * 5)]!);
    setArtStyle(pick(ART_STYLES));
    setBodyType(pick(BODY_TYPES));
    const shuffled = [...TRAITS].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 4));
    setTraits(shuffled);
    setOrientation(pick(ORIENTATIONS));
    const prefixes = ["Nyx", "Vex", "Rune", "Sable", "Zephyr", "Marrow", "Lux", "Hex"];
    setNamePrefix(pick(prefixes));
    setName(`${pick(prefixes)} ${pick(["Vale", "Noct", "Drift", "Quill", "Fable"])}`);
    setTagline(pick(["Whispers behind velvet rope", "Your glitch in the matrix", "Built from desire & code", "Dangerously attentive"]));
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
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
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
          is_public: isPublic,
          approved: false,
          avatar_url: previewUrl,
        });
      }

      const { error } = await supabase.from("custom_characters").insert(rows);
      if (error) {
        if (!isAdmin) await addTokens(finalTotalCost);
        throw error;
      }
      toast.success(
        batchCount === 1
          ? "Companion bound to your vault."
          : `${batchCount} companions forged.`,
      );
      if (!embedded && mode === "user") navigate("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Create failed";
      toast.error(msg);
    } finally {
      setFinalLoading(false);
    }
  };

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
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className={cn("grid gap-2", cols)}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-xl border px-2 py-2 text-left text-xs sm:text-sm transition-all",
              value === opt
                ? "border-primary bg-primary/15 text-primary shadow-[0_0_20px_rgba(255,45,123,0.12)]"
                : "border-border/80 bg-black/30 text-muted-foreground hover:border-border hover:text-foreground",
            )}
            style={value === opt ? { borderColor: `${NEON}66` } : undefined}
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
        <Loader2 className="h-10 w-10 animate-spin text-primary" style={{ color: NEON }} />
      </div>
    );
  }

  const shell = (
    <div className={cn("relative font-sans", embedded ? "min-h-0" : "min-h-screen bg-background")}>
      {!embedded && <ParticleBackground />}
      {!embedded && (
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-background pointer-events-none" />
      )}

      <div className={cn("relative z-10", embedded ? "px-0 py-0" : "px-4 md:px-8 py-8")}>
        {!embedded && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div className="flex flex-col lg:flex-row lg:items-start gap-8 max-w-[1600px] mx-auto">
          {/* Left — controls */}
          <div className="w-full lg:w-[min(520px,42%)] shrink-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-gothic text-3xl md:text-4xl font-bold gradient-vice-text flex items-center gap-2">
                  <Sparkles className="h-8 w-8 shrink-0" style={{ color: NEON }} />
                  Companion Creator
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin ? "Admin forge — no token cost." : "Forge previews cheaply, commit when you are certain."}
                </p>
              </div>
              {!isAdmin && (
                <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2">
                  <Coins className="h-4 w-4 text-primary" style={{ color: NEON }} />
                  <span className="text-sm font-semibold tabular-nums">{tokens ?? "—"}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">tokens</span>
                </div>
              )}
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={randomizeAll}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-primary-foreground border border-white/10 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${NEON}, hsl(280 50% 35%), hsl(170 100% 40%))`,
              }}
            >
              <Dices className="h-5 w-5" />
              Randomize / Roulette
            </motion.button>

            <Accordion type="multiple" defaultValue={["identity", "personality", "world", "body", "output"]} className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md px-4">
              <AccordionItem value="identity" className="border-border/60">
                <AccordionTrigger className="font-gothic text-lg hover:no-underline py-4">
                  Gender & identity
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-4">
                  <PillGroup label="Identity" options={GENDERS} value={gender} onChange={setGender} />
                  <PillGroup label="Orientation" options={ORIENTATIONS} value={orientation} onChange={setOrientation} cols="grid-cols-2 sm:grid-cols-3" />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="personality" className="border-border/60">
                <AccordionTrigger className="font-gothic text-lg hover:no-underline py-4">
                  Personality archetype
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <PillGroup label="Archetype" options={PERSONALITIES} value={personality} onChange={setPersonality} cols="grid-cols-2 sm:grid-cols-2" />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="world" className="border-border/60">
                <AccordionTrigger className="font-gothic text-lg hover:no-underline py-4">
                  Vibe & theme
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-4">
                  <PillGroup label="Vibe" options={VIBES} value={vibe} onChange={setVibe} cols="grid-cols-2 sm:grid-cols-2" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Theme / setting (optional)
                    </p>
                    <input
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="e.g. rain-slick rooftop, velvet VIP lounge…"
                      className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="body" className="border-border/60">
                <AccordionTrigger className="font-gothic text-lg hover:no-underline py-4">
                  Art style & body
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-4">
                  <PillGroup label="Art style" options={ART_STYLES} value={artStyle} onChange={setArtStyle} />
                  <PillGroup label="Body type" options={BODY_TYPES} value={bodyType} onChange={setBodyType} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Special traits
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TRAITS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTrait(t)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-all",
                            traits.includes(t)
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-border/70 bg-black/30 text-muted-foreground hover:border-border",
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

              <AccordionItem value="output" className="border-border/60">
                <AccordionTrigger className="font-gothic text-lg hover:no-underline py-4">
                  Naming & batch
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Name</p>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Companion name"
                      className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm mb-2"
                    />
                    <input
                      value={namePrefix}
                      onChange={(e) => setNamePrefix(e.target.value)}
                      placeholder="Optional prefix (title / clan)"
                      className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Tagline</p>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Short hook for cards"
                      className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Companions per forge
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {BATCH_PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setBatchPreset(n)}
                          className={cn(
                            "rounded-xl border px-4 py-2 text-sm font-medium",
                            batchPreset === n ? "border-primary bg-primary/15 text-primary" : "border-border bg-black/30",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBatchPreset(-1)}
                        className={cn(
                          "rounded-xl border px-4 py-2 text-sm font-medium",
                          batchPreset === -1 ? "border-accent bg-accent/15 text-accent" : "border-border bg-black/30",
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
                        className="mt-2 w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Extra notes for Grok
                    </p>
                    <textarea
                      value={extraNotes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                      rows={3}
                      placeholder="Voice tics, limits, favorite scenarios…"
                      className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm resize-none"
                    />
                  </div>
                  <label className="flex items-center justify-between rounded-xl border border-border/80 bg-black/30 px-4 py-3 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm">
                      {isPublic ? <Globe className="h-4 w-4 text-accent" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      Request public catalog (moderated)
                    </span>
                    <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-[#FF2D7B]" />
                  </label>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="space-y-3 sticky bottom-4 lg:static">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={previewLoading}
                onClick={() => void runPreview()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-primary-foreground glow-pink disabled:opacity-50"
                style={{ backgroundColor: NEON }}
              >
                {previewLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                Generate 1 preview with Grok · {isAdmin ? "Free" : `${PREVIEW_COST} tokens`}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={finalLoading || !name.trim()}
                onClick={() => void runFinalCreate()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold border-2 border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {finalLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flame className="h-5 w-5" />}
                Create {batchCount} companion{batchCount > 1 ? "s" : ""} · {isAdmin ? "Free" : `${finalTotalCost} tokens`}
              </motion.button>
            </div>
          </div>

          {/* Right — live preview */}
          <div className="flex-1 min-w-0 lg:sticky lg:top-8 space-y-4">
            <div className="rounded-[1.75rem] border border-border/80 bg-black/50 backdrop-blur-xl overflow-hidden shadow-[0_0_60px_rgba(255,45,123,0.08)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-card/30">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  Live generation preview
                </span>
                <span className="text-[10px] text-muted-foreground">Updates with your selections</span>
              </div>
              <div className="p-4 sm:p-6">
                <div className="relative aspect-[3/4] max-h-[min(78vh,820px)] mx-auto rounded-2xl overflow-hidden border border-primary/20">
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
                        className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8"
                        style={{
                          background: `linear-gradient(160deg, #1a0a14, ${NEON}55, hsl(280 40% 25%), hsl(170 30% 20%))`,
                        }}
                      >
                        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,white,transparent_40%)]" />
                        <p className="text-[10px] uppercase tracking-[0.35em] text-white/60 mb-2 relative">Spec sheet</p>
                        <h2 className="font-gothic text-2xl sm:text-4xl text-white text-glow-pink relative leading-tight">
                          {name || "Unnamed desire"}
                        </h2>
                        <p className="text-sm text-white/75 italic mt-2 relative line-clamp-2">{tagline || "Your fantasy, forged live."}</p>
                        <div className="mt-4 flex flex-wrap gap-2 relative">
                          {[gender, personality, vibe, artStyle, bodyType].map((x) => (
                            <span
                              key={x}
                              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-black/40 border border-white/10 text-white/90"
                            >
                              {x}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {previewLoading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" style={{ color: NEON }} />
                      <p className="text-sm text-white/90">Grok is painting your portrait…</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 rounded-xl border border-border/60 bg-card/30 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Prompt sent to Grok</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 sm:line-clamp-none">{grokPrompt}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex gap-3 items-start">
              <ImageIcon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Previews bill <strong className="text-primary" style={{ color: NEON }}>{PREVIEW_COST} tokens</strong> each so you can iterate freely.
                Final creation locks <strong className="text-accent">{FINAL_COST_PER} tokens</strong> per companion ({finalTotalCost} total for this batch).
                All image gen stays SFW per forge policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return shell;
}
