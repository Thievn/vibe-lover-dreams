import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const TEMPLATES = (name: string) => [
  `${name} is biting her lip…`,
  `${name} is getting excited…`,
  `${name} is thinking of you…`,
  `${name} is typing something wicked…`,
  `${name} is leaning closer…`,
  `${name} is composing a tease…`,
];

export function ChatTypingIndicator({
  companionName,
  isImageRequest,
}: {
  companionName: string;
  isImageRequest: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const lines = TEMPLATES(companionName);

  useEffect(() => {
    if (isImageRequest) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % lines.length), 2200);
    return () => clearInterval(t);
  }, [lines.length, isImageRequest]);

  return (
    <div className="flex justify-start gap-2 pl-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-border/60 text-[10px] font-gothic font-bold text-muted-foreground">
        {companionName.charAt(0)}
      </div>
      <div className="max-w-[82%] rounded-[1.25rem] rounded-bl-md border border-white/[0.08] bg-black/50 px-4 py-3 shadow-inner">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <span className="italic">
            {isImageRequest ? `${companionName} is creating something for you…` : lines[idx]}
          </span>
        </div>
      </div>
    </div>
  );
}
