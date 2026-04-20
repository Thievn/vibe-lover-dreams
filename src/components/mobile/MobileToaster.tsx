import { AlertCircle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { Toaster } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const toastBase =
  "!border !shadow-xl !rounded-xl !backdrop-blur-xl !border-white/[0.09] !bg-[hsl(240_15%_6%/0.94)] !text-foreground !shadow-[0_12px_48px_rgba(0,0,0,0.55),0_0_0_1px_hsl(280_30%_18%/0.35)]";

/** Matches site neon (pink / purple / teal) instead of Sonner default greens. */
export function MobileToaster() {
  const isMobile = useIsMobile();
  return (
    <Toaster
      position={isMobile ? "top-center" : "top-right"}
      theme="dark"
      richColors={false}
      closeButton
      className={isMobile ? "pt-[max(0.5rem,env(safe-area-inset-top))]" : undefined}
      toastOptions={{
        classNames: {
          toast: [toastBase, isMobile ? "touch-manipulation" : "", "!items-start !gap-3 !py-3.5 !px-4"].filter(Boolean).join(" "),
          title: "!text-[13px] !font-semibold !leading-snug !text-foreground",
          description: "!text-[12px] !leading-relaxed !text-muted-foreground !opacity-95",
          content: "!gap-1",
          icon: "!mt-0.5",
          closeButton:
            "!left-auto !right-2 !top-2 !translate-x-0 !translate-y-0 !h-7 !w-7 !rounded-lg !border !border-white/12 !bg-black/50 !text-foreground/80 hover:!bg-primary/15 hover:!border-primary/35 hover:!text-primary !transition-colors",
          success: [
            "!border-primary/40",
            "!bg-gradient-to-br !from-primary/[0.14] !via-[hsl(240_15%_6%/0.92)] !to-[hsl(280_28%_9%/0.88)]",
            "!shadow-[0_0_36px_hsl(330_100%_58%/0.14),0_12px_40px_rgba(0,0,0,0.45)]",
          ].join(" "),
          error: [
            "!border-[hsl(0_80%_55%/0.45)]",
            "!bg-gradient-to-br !from-[hsl(0_80%_55%/0.12)] !via-[hsl(240_15%_6%/0.94)] !to-[hsl(240_15%_6%/0.9)]",
            "!shadow-[0_0_28px_hsl(0_80%_55%/0.12)]",
          ].join(" "),
          info: [
            "!border-accent/35",
            "!bg-gradient-to-br !from-accent/[0.1] !via-[hsl(240_15%_6%/0.94)] !to-[hsl(240_15%_6%/0.9)]",
            "!shadow-[0_0_28px_hsl(170_100%_50%/0.1)]",
          ].join(" "),
          warning: [
            "!border-amber-500/40",
            "!bg-gradient-to-br !from-amber-500/[0.12] !via-[hsl(240_15%_6%/0.94)] !to-[hsl(240_15%_6%/0.9)]",
          ].join(" "),
          loading: "!border-primary/25 !bg-[hsl(240_15%_6%/0.94)]",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-[18px] w-[18px] text-primary" strokeWidth={2} aria-hidden />,
        info: <Info className="h-[18px] w-[18px] text-accent" strokeWidth={2} aria-hidden />,
        warning: <AlertCircle className="h-[18px] w-[18px] text-amber-400" strokeWidth={2} aria-hidden />,
        error: <XCircle className="h-[18px] w-[18px] text-destructive" strokeWidth={2} aria-hidden />,
        loading: <Loader2 className="h-[18px] w-[18px] animate-spin text-primary" strokeWidth={2} aria-hidden />,
      }}
    />
  );
}
