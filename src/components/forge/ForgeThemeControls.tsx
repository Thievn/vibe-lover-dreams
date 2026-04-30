import { Dices } from "lucide-react";
import {
  FORGE_TAB_FIELD_ROWS,
  type ForgeTabFeatureMap,
  type ForgeThemeTabId,
  randomizeForgeTabField,
} from "@/lib/forgeThemeTabs";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

function FieldDice({ onRoll, title }: { onRoll: () => void; title: string }) {
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

export type ForgeThemeControlsProps = {
  activeTab: ForgeThemeTabId;
  features: ForgeTabFeatureMap[ForgeThemeTabId];
  onFeaturesChange: (next: ForgeTabFeatureMap[ForgeThemeTabId]) => void;
};

export function ForgeThemeControls({ activeTab, features, onFeaturesChange }: ForgeThemeControlsProps) {
  const rows = FORGE_TAB_FIELD_ROWS[activeTab];
  const f = features as Record<string, number | string | boolean>;

  const patch = (key: string, value: number | string | boolean) => {
    onFeaturesChange({ ...f, [key]: value } as ForgeTabFeatureMap[ForgeThemeTabId]);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        const prev = idx > 0 ? rows[idx - 1] : undefined;
        const showSection = Boolean(row.section && row.section !== prev?.section);
        const sectionHeader = showSection ? (
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
              idx > 0 ? "pt-3 border-t border-white/10" : "",
            )}
          >
            {row.section}
          </p>
        ) : null;

        const v = f[row.key];

        const control = (() => {
          if (row.kind === "toggle") {
            const on = Boolean(v);
            return (
              <div className="flex items-center gap-3">
                <Switch checked={on} onCheckedChange={(x) => patch(row.key, x)} />
                <span className="text-[11px] text-muted-foreground">{on ? "On" : "Off"}</span>
              </div>
            );
          }

          if (row.kind === "select" && row.selectOptions?.length) {
            const val = typeof v === "string" ? v : row.selectOptions[0]!;
            return (
              <Select value={val} onValueChange={(x) => patch(row.key, x)}>
                <SelectTrigger className="h-9 w-full max-w-[220px] border-white/12 bg-black/45 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[hsl(280_25%_10%)] text-white">
                  {row.selectOptions.map((opt, i) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {row.selectLabels?.[i] ?? opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          if (row.kind === "numberInput") {
            const n = typeof v === "number" ? v : 0;
            const min = row.sliderMin ?? 0;
            const max = row.sliderMax ?? 9_999_999;
            return (
              <input
                type="number"
                min={min}
                max={max}
                value={Number.isFinite(n) ? n : 0}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const clamped = Math.max(min, Math.min(max, Number.isFinite(raw) ? Math.floor(raw) : 0));
                  patch(row.key, clamped);
                }}
                className="h-9 w-full max-w-[140px] rounded-lg border border-white/12 bg-black/45 px-2 text-xs tabular-nums"
              />
            );
          }

          const min = row.sliderMin ?? 0;
          const max = row.sliderMax ?? 100;
          const num = typeof v === "number" ? clampForgeNum(v, min, max) : min;
          return (
            <div className="space-y-1.5 w-full">
              <Slider
                value={[num]}
                min={min}
                max={max}
                step={1}
                onValueChange={([x]) => patch(row.key, x ?? min)}
                className="w-full"
              />
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {num}
                {max === 100 ? " / 100" : max === 12 ? " appendages" : ` / ${max}`}
              </p>
            </div>
          );
        })();

        return (
          <div key={row.key} className="space-y-1">
            {sectionHeader}
            <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground/95">{row.label}</p>
                    <FieldDice
                      title={`Randomize ${row.label}`}
                      onRoll={() => onFeaturesChange(randomizeForgeTabField(activeTab, row.key, features))}
                    />
                  </div>
                  {row.hint ? <p className="text-[10px] text-muted-foreground/85 leading-snug">{row.hint}</p> : null}
                  <div className="pt-1">{control}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
        These controls feed the same theme block as your preview portrait and design lab — tune sliders, then open{" "}
        <span className="text-foreground/80">Rendering</span> or <span className="text-foreground/80">Personalities</span>{" "}
        to refine further.
      </p>
    </div>
  );
}

function clampForgeNum(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}
