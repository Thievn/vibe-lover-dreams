import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAILY_FREE_CHAT_MESSAGES } from "@/lib/forgeEconomy";
import { formatCountdown, msUntilNextEasternChatQuotaReset } from "@/lib/chatDailyQuota";

type Props = {
  remainingFree: number;
  nextLineFc: number;
  isAdminUser: boolean;
  className?: string;
  /** When false, hide entirely (e.g. logged out). */
  visible: boolean;
};

/**
 * Compact strip: daily free text pool + Eastern 3 AM reset countdown + next-line FC after quota.
 */
export function DailyFreeMessagesBar({ remainingFree, nextLineFc, isAdminUser, className, visible }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visible || isAdminUser) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [visible, isAdminUser]);

  const resetLabel = useMemo(() => formatCountdown(msUntilNextEasternChatQuotaReset()), [tick]);

  if (!visible || isAdminUser) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-white/[0.1] bg-gradient-to-r from-fuchsia-950/50 via-black/50 to-cyan-950/35 px-3 py-2 text-[10px] sm:text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 font-medium text-white/90">
        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="truncate">
          <span className="text-primary font-semibold">{remainingFree}</span> / {DAILY_FREE_CHAT_MESSAGES} free text
          lines today
          {nextLineFc > 0 ? (
            <>
              {" "}
              · then <span className="font-semibold text-amber-200/95">{nextLineFc} FC</span> each
            </>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground/90">
        Resets <span className="text-cyan-200/90">{resetLabel}</span>{" "}
        <span className="text-[9px] uppercase">3 AM Eastern</span>
      </span>
    </div>
  );
}
