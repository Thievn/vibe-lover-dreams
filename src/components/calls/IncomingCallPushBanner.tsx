import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Phone, X } from "lucide-react";
import { INCOMING_CALL_PUSH_EVENT, type IncomingCallPushDetail } from "@/lib/companionCallNotifications";

export function IncomingCallPushBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState<IncomingCallPushDetail | null>(null);

  useEffect(() => {
    const onPush = (ev: Event) => {
      const ce = ev as CustomEvent<IncomingCallPushDetail>;
      const d = ce.detail;
      if (!d?.url) return;
      try {
        const target = new URL(d.url, window.location.origin);
        const here = `${location.pathname}${location.search}`;
        if (target.pathname + target.search === here) return;
      } catch {
        return;
      }
      setOpen(d);
    };
    window.addEventListener(INCOMING_CALL_PUSH_EVENT, onPush as EventListener);
    return () => window.removeEventListener(INCOMING_CALL_PUSH_EVENT, onPush as EventListener);
  }, [location.pathname, location.search]);

  const dismiss = useCallback(() => setOpen(null), []);

  const answer = useCallback(() => {
    if (!open?.url) return;
    try {
      const u = new URL(open.url, window.location.origin);
      navigate(`${u.pathname}${u.search}${u.hash}`);
    } catch {
      navigate(open.url);
    }
    setOpen(null);
  }, [navigate, open]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 top-0 z-[200] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
      role="dialog"
      aria-label="Incoming call"
    >
      <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-pink-500/35 bg-black/75 px-4 py-3 shadow-[0_12px_48px_rgba(255,45,123,0.25)] backdrop-blur-xl">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-pink-200">
          <Phone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{open.title}</p>
          {open.body ? <p className="truncate text-xs text-white/65">{open.body}</p> : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={answer}
          className="shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_24px_rgba(236,72,153,0.35)] transition hover:brightness-110"
        >
          Answer
        </button>
      </div>
    </div>
  );
}
