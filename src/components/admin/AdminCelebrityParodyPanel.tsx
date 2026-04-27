import { useState } from "react";
import { ChevronDown, Loader2, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onGenerate: (celebrityName: string, grotesqueGpk: boolean) => Promise<void>;
  className?: string;
};

/**
 * Admin Companion Forge — prominent celebrity/character parody entry (Grok profile pass → forge fields).
 */
export function AdminCelebrityParodyPanel({ onGenerate, className }: Props) {
  const [celebrityName, setCelebrityName] = useState("");
  const [grotesqueGpk, setGrotesqueGpk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = celebrityName.trim();
    if (!t) return;
    setBusy(true);
    try {
      await onGenerate(t, grotesqueGpk);
    } catch {
      /* errors + toasts handled in CompanionCreator */
    } finally {
      setBusy(false);
    }
  };

  return (
    <details
      defaultOpen
      className={cn(
        "group rounded-xl border border-[#FF2D7B]/35 bg-gradient-to-br from-[#2a0a18]/90 via-black/55 to-amber-950/20 overflow-hidden [&_summary::-webkit-details-marker]:hidden",
        className,
      )}
    >
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 hover:bg-black/25">
        <div className="flex items-center gap-2 text-sm font-bold text-white min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FF2D7B]/40 bg-[#FF2D7B]/15">
            <Star className="h-4 w-4 text-[#ffb8d9]" fill="currentColor" fillOpacity={0.35} />
          </span>
          <span className="truncate">Celebrity Parody</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FF2D7B]/90 shrink-0 hidden sm:inline">
            · one-click profile
          </span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Type any celebrity or famous character — we generate a <strong className="text-foreground/90">parody name</strong>, personality,
          traits, outfit, chronicle, starters, and a <strong className="text-foreground/90">2:3 portrait prompt</strong>. Then use{" "}
          <strong className="text-foreground/90">Live preview</strong> in the forge.
        </p>
        <input
          type="text"
          value={celebrityName}
          onChange={(e) => setCelebrityName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy && celebrityName.trim()) void submit();
          }}
          placeholder='e.g. "Margot Robbie", "Wednesday Addams", "Elon Musk"…'
          className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF2D7B]/45 focus:ring-2 focus:ring-[#FF2D7B]/15"
        />
        <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={grotesqueGpk}
            onChange={(e) => setGrotesqueGpk(e.target.checked)}
            className="accent-[#FF2D7B] mt-0.5 h-4 w-4 shrink-0"
          />
          <span className="text-xs text-muted-foreground leading-snug">
            <span className="font-semibold text-foreground/90 block">Garbage Pail Kids / grotesque style</span>
            Exaggerated gross-out trading-card caricature (still SFW). Off by default — cleaner glam-parody when unchecked.
          </span>
        </label>
        <button
          type="button"
          disabled={busy || !celebrityName.trim()}
          onClick={() => void submit()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#FF2D7B]/45 bg-gradient-to-r from-[#FF2D7B]/90 to-fuchsia-800/90 px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_28px_rgba(255,45,123,0.25)] disabled:opacity-45 disabled:pointer-events-none"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin shrink-0" /> : <Sparkles className="h-5 w-5 shrink-0" />}
          Generate Parody
        </button>
      </div>
    </details>
  );
}
