import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { ToyControlPanel } from "@/components/toy/ToyControlPanel";
import { LovensePairingQrBlock } from "@/components/toy/LovensePairingQrBlock";
import type { LovenseToy } from "@/lib/lovense";
import type { CompanionVibrationPatternRow } from "@/hooks/useCompanionVibrationPatterns";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  companionName: string;
  connectedCount: number;
  activeCount: number;
  affectionPct: number;
  breedingStage: number;
  hasDevice: boolean;
  pairingQrUrl: string | null;
  toyUtilityBusy: boolean;
  pairingLoading: boolean;
  onCancelPairing?: () => void;
  onTestToy: () => void;
  onDisconnectToy: () => void;
  onStopAll: () => void;
  onConnectToy: () => void;
  onBreedingRitual: () => void;
  toys: LovenseToy[];
  primaryToyId: string | null;
  onSelectPrimaryToy: (uid: string) => void;
  patterns: CompanionVibrationPatternRow[];
  patternsLoading: boolean;
  sendingVibrationId: string | null;
  activePatternId?: string | null;
  onTriggerPattern: (row: CompanionVibrationPatternRow) => void;
};

export function ChatDevicesCollapsible({
  className,
  companionName,
  connectedCount,
  activeCount,
  affectionPct,
  breedingStage,
  hasDevice,
  pairingQrUrl,
  toyUtilityBusy,
  pairingLoading,
  onCancelPairing,
  onTestToy,
  onDisconnectToy,
  onStopAll,
  onConnectToy,
  onBreedingRitual,
  toys,
  primaryToyId,
  onSelectPrimaryToy,
  patterns,
  patternsLoading,
  sendingVibrationId,
  activePatternId = null,
  onTriggerPattern,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "shrink-0 border-b border-white/[0.07] bg-black/35 backdrop-blur-xl",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 md:px-5 text-left hover:bg-white/[0.04] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Session & devices</p>
          <p className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-foreground/90">
            {connectedCount > 0 ? `${connectedCount} linked · ${activeCount} active` : "No toy connected"} · Affection{" "}
            {affectionPct}% · Breeding {breedingStage} / 3
          </p>
        </div>
        <span className="text-muted-foreground shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-3 pb-3 md:px-5 space-y-3 border-t border-white/[0.06] pt-3">
            <div className="flex flex-wrap gap-2">
              {hasDevice ? (
                <>
                  <button
                    type="button"
                    onClick={() => void onTestToy()}
                    disabled={toyUtilityBusy}
                    className="rounded-xl bg-primary/90 px-3 py-2 text-[11px] font-semibold text-primary-foreground hover:bg-primary disabled:opacity-50"
                  >
                    Test Toy
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDisconnectToy()}
                    disabled={toyUtilityBusy}
                    className="rounded-xl bg-destructive/90 px-3 py-2 text-[11px] font-semibold text-destructive-foreground hover:bg-destructive disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => void onStopAll()}
                    disabled={toyUtilityBusy}
                    className="rounded-xl bg-destructive/70 px-3 py-2 text-[11px] font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    Stop All
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void onConnectToy()}
                  disabled={pairingLoading}
                  className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {pairingLoading ? "Pairing..." : "Connect Toy"}
                </button>
              )}
              <button
                type="button"
                onClick={onBreedingRitual}
                className="rounded-xl bg-secondary/90 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-secondary"
              >
                Breeding Ritual
              </button>
            </div>

            {hasDevice ? (
              <ToyControlPanel
                toys={toys}
                primaryToyId={primaryToyId}
                onSelectPrimaryToy={onSelectPrimaryToy}
                patterns={patterns}
                patternsLoading={patternsLoading}
                disabled={false}
                sendingId={sendingVibrationId}
                activePatternId={activePatternId}
                onTrigger={(row) => void onTriggerPattern(row)}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-3 py-3 text-[11px] text-muted-foreground space-y-3">
                <p className="text-center">
                  Pair your Lovense toy to unlock <span className="text-primary/90">{companionName}</span>&apos;s
                  signature vibration patterns in this chat.
                </p>
                <LovensePairingQrBlock
                  compact
                  qrImageUrl={pairingQrUrl}
                  loading={pairingLoading}
                  onCancel={onCancelPairing}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
