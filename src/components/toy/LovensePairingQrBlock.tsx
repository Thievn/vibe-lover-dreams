import { Loader2, QrCode } from "lucide-react";
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
        <strong className="text-foreground">Scan / Link</strong>, and scan this code. Keep this screen open until we
        confirm the link.
      </p>
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl bg-white p-3 shadow-inner">
          <img src={qrImageUrl} alt="Lovense pairing QR" className={cn(compact ? "w-40 h-40" : "w-48 h-48")} />
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground animate-pulse">
          <QrCode className="h-3.5 w-3.5 shrink-0 opacity-70" />
          Waiting for LustForge to register your toy…
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
