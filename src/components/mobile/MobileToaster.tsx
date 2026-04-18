import { Toaster } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

/** Positions toasts above the fixed mobile tab bar and thumb zone. */
export function MobileToaster() {
  const isMobile = useIsMobile();
  return (
    <Toaster
      position={isMobile ? "top-center" : "top-right"}
      richColors
      closeButton
      className={isMobile ? "pt-[max(0.5rem,env(safe-area-inset-top))]" : undefined}
      toastOptions={{
        classNames: {
          toast: isMobile ? "touch-manipulation" : undefined,
        },
      }}
    />
  );
}
