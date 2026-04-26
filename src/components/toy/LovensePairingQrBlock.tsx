import { Loader2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  qrImageUrl: string | null;
  loading: boolean;
  onCancel?: () => void;
  className?: string;
  /** Smaller copy for popovers */
  compact?: boolean;
};

/**
 * Lovense returns an **image URL** for the QR — show it inline; do not use it as a browser link.
 */
export function LovensePairingQrBlock({ qrImageUrl, loading, onCancel, className, compact }: Props) {
  const [handheldHint, setHandheldHint] = useState(false);

  useEffect(() => {
    const run = () => {
      const narrow = window.matchMedia("(max-width: 768px)").matches;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      setHandheldHint(narrow || coarse);
    };
    run();
    const m1 = window.matchMedia("(max-width: 768px)");
    const m2 = window.matchMedia("(pointer: coarse)");
    m1.addEventListener("change", run);
    m2.addEventListener("change", run);
    window.addEventListener("resize", run);
    return () => {
      m1.removeEventListener("change", run);
      m2.removeEventListener("change", run);
      window.removeEventListener("resize", run);
    };
  }, []);

  if (loading && !qrImageUrl) {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground text-center">Getting QR code…</p>
      </div>
    );
  }

  if (!qrImageUrl) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <p className={cn("text-muted-foreground", compact ? "text-[11px] leading-relaxed" : "text-xs leading-relaxed")}>
        Open <strong className="text-foreground">Lovense Remote</strong> on your phone, choose{" "}
        <strong className="text-foreground">Scan / Link</strong>, and scan this code. Keep this LustForge screen open
        until the link finishes.
      </p>
      <p
        className={cn(
          "rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground",
          compact ? "text-[10px] leading-relaxed px-2 py-1.5" : "text-[11px] leading-relaxed px-2.5 py-2",
        )}
      >
        <strong className="text-foreground/90">After you&apos;re linked</strong>, haptics use your LustForge account
        through our servers — <strong className="text-foreground/90">mobile PWA and PC work the same</strong> for toy
        control. Keep <strong className="text-foreground/90">Lovense Remote</strong> running (or your toy online the way
        Lovense expects) so commands reach the device.
      </p>
      {handheldHint ? (
        <div
          className={cn(
            "rounded-lg border border-amber-500/35 bg-amber-950/25 text-amber-100/95",
            compact ? "px-2 py-1.5 text-[10px] leading-snug" : "px-2.5 py-2 text-[11px] leading-snug",
          )}
        >
          <p className="font-semibold text-amber-50/95">Same phone showing this QR?</p>
          <p className="mt-1 text-amber-100/85">
            You normally can&apos;t scan a code on the same screen. Use a <strong className="text-amber-50">PC or
            second phone/tablet</strong> to open LustForge and show this QR, then scan with Lovense Remote on this
            phone — or pair <strong className="text-amber-50">once</strong> from a desktop browser, then open LustForge
            here; the toy stays on your account.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl bg-white p-3 shadow-inner">
          <img src={qrImageUrl} alt="Lovense pairing QR" className={cn(compact ? "w-40 h-40" : "w-48 h-48")} />
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground animate-pulse">
          <QrCode className="h-3.5 w-3.5 shrink-0 opacity-70" />
          Finishing link with LustForge — keep this page open…
        </p>
      </div>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
