import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CompanionGalleryGrid } from "@/components/companion/CompanionGalleryGrid";
import type { CompanionGalleryRow } from "@/hooks/useCompanionGeneratedImages";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  images: CompanionGalleryRow[];
  loading: boolean;
  currentPortraitUrl: string | null | undefined;
  onSetAsPortrait: (imageUrl: string) => Promise<void>;
};

export function ChatGallerySheet({
  open,
  onOpenChange,
  companionName,
  images,
  loading,
  currentPortraitUrl,
  onSetAsPortrait,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] rounded-t-3xl border-t border-white/10 bg-[#050508]/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 overflow-y-auto"
      >
        <SheetHeader className="text-left pb-2 space-y-1">
          <SheetTitle className="font-gothic text-xl text-foreground">{companionName}&apos;s gallery</SheetTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Every image you generate in chat is saved here. Tap one to set it as their portrait.
          </p>
        </SheetHeader>
        <div className="pt-2 pb-6">
          <CompanionGalleryGrid
            companionName={companionName}
            images={images}
            loading={loading}
            currentPortraitUrl={currentPortraitUrl}
            onSetAsPortrait={onSetAsPortrait}
            compact
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
