import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useChatSessionController } from "./chat/useChatSessionController";
import { ChatDesktopLayout } from "./chat/ChatDesktopLayout";

const MobileChatLayout = lazy(async () => {
  const m = await import("@/mobile/chat/MobileChatLayout");
  return { default: m.MobileChatLayout };
});

const Chat = () => {
  const session = useChatSessionController();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (session.companionsLoading || session.forgeLookupBusy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session.companion) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-muted-foreground">Companion not found.</p>
        <Link to="/" className="text-sm text-primary hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      {isMobile ? <MobileChatLayout {...session} /> : <ChatDesktopLayout {...session} />}
    </Suspense>
  );
};

export default Chat;
