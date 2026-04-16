import { Zap, Link2, Loader2, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { LovenseToy } from "@/lib/lovense";

type Props = {
  toys: LovenseToy[];
  loading?: boolean;
  pairingLoading: boolean;
  pairingUrl: string | null;
  onRefresh: () => void | Promise<void>;
  onConnect: () => void | Promise<void>;
  onDisconnectOne: (deviceUid: string) => void | Promise<void>;
  onToggleEnabled: (deviceUid: string, enabled: boolean) => void | Promise<void>;
};

export function ToyHubPopover({
  toys,
  loading,
  pairingLoading,
  pairingUrl,
  onRefresh,
  onConnect,
  onDisconnectOne,
  onToggleEnabled,
}: Props) {
  const n = toys.length;
  const open = pairingUrl;

  return (
    <Popover
      onOpenChange={(o) => {
        if (o) void onRefresh();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors",
            n > 0
              ? "border-[#00ffd4]/35 bg-[#00ffd4]/10 text-[#00ffd4] hover:bg-[#00ffd4]/15"
              : "border-border bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Toys</span>
          {n > 0 && (
            <span className="min-w-[1.25rem] rounded-full bg-background/80 px-1 text-center text-[10px] font-bold text-[#00ffd4]">
              +{n}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] p-0 border-white/10 bg-[hsl(280_25%_8%)] text-foreground shadow-2xl">
        <div className="border-b border-white/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Lovense devices</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable which toys can receive AI &amp; pattern commands. Each has a stable id for routing.
          </p>
        </div>

        <div className="max-h-[min(60vh,22rem)] overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : toys.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No toys linked yet.</p>
          ) : (
            toys.map((t) => (
              <div
                key={t.id}
                className="flex gap-2 rounded-xl border border-white/[0.07] bg-black/40 p-2.5"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                  <img src={t.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">{t.type}</p>
                  <p className="text-[9px] font-mono text-muted-foreground/80 truncate" title={t.id}>
                    id {t.id.slice(0, 8)}…
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">Active</span>
                    <Switch
                      checked={t.enabled}
                      onCheckedChange={(v) => {
                        void onToggleEnabled(t.id, v);
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  title="Unlink this toy"
                  className="self-start rounded-lg p-1.5 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    void onDisconnectOne(t.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-2 space-y-2">
          <button
            type="button"
            disabled={pairingLoading}
            onClick={() => void onConnect()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pairingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Add / pair another device
          </button>
          {open ? (
            <a
              href={pairingUrl!}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-[11px] text-primary underline font-medium"
            >
              Open pairing portal
            </a>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
