import type { RefObject } from "react";
import { motion } from "framer-motion";
import { Zap, Volume2, Loader2 } from "lucide-react";
import { ImageMessage } from "@/components/ImageMessage";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import type { Companion } from "@/data/companions";
import type { ChatMessage } from "@/components/chat/chatTypes";
import { ChatTypingIndicator } from "@/components/chat/ChatTypingIndicator";
import { cn } from "@/lib/utils";

type Props = {
  messages: ChatMessage[];
  companion: Companion;
  companionImageUrl: string | null;
  userAvatarUrl: string | null;
  userInitials: string;
  loading: boolean;
  isImageRequest: (text: string) => boolean;
  inputSnapshot: string;
  hasDevice: boolean;
  onImageClick: (msg: ChatMessage) => void;
  labelForLovenseCmd: (cmd: Record<string, unknown> | null | undefined) => string;
  /** Speaker control for assistant text (no image) messages. */
  onTtsClick?: (msg: ChatMessage) => void;
  ttsLoadingId?: string | null;
  ttsPlayingId?: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onSaveImageBackup?: (generatedImageId: string) => void;
  savingBackupImageId?: string | null;
  /** Inline confirm before spending tokens on an image (when auto-spend is off). */
  imageGenPending?: { userMessageId: string; prompt: string } | null;
  onConfirmPendingImage?: () => void;
  pendingImageButtonLabel?: string;
};

export function ChatMessageThread({
  messages,
  companion,
  companionImageUrl,
  userAvatarUrl,
  userInitials,
  loading,
  isImageRequest,
  inputSnapshot,
  hasDevice,
  onImageClick,
  labelForLovenseCmd,
  onTtsClick,
  ttsLoadingId,
  ttsPlayingId,
  messagesEndRef,
  onSaveImageBackup,
  savingBackupImageId,
  imageGenPending = null,
  onConfirmPendingImage,
  pendingImageButtonLabel = "Generate image",
}: Props) {
  const rarity = normalizeCompanionRarity(companion.rarity);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 md:px-5 md:py-4 space-y-3 scroll-pb-28 [-webkit-overflow-scrolling:touch]">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
        >
          {msg.role === "assistant" ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-full border border-white/10 bg-black/40 p-0.5">
              <TierHaloPortraitFrame
                variant="avatar"
                frameStyle="clean"
                rarity={rarity}
                gradientFrom={companion.gradientFrom}
                gradientTo={companion.gradientTo}
                aspectClassName="aspect-square w-9 h-9"
                className="rounded-full"
              >
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    background: companionImageUrl
                      ? undefined
                      : `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
                  }}
                />
                {companionImageUrl ? (
                  <img
                    src={companionImageUrl}
                    alt=""
                    className="absolute inset-0 z-[1] h-full w-full object-cover object-top"
                  />
                ) : (
                  <span className="absolute inset-0 z-[2] flex items-center justify-center text-[11px] font-gothic font-bold text-white/95">
                    {companion.name.charAt(0)}
                  </span>
                )}
              </TierHaloPortraitFrame>
            </div>
          ) : null}

          <div
            className={cn(
              "max-w-[min(92%,28rem)] rounded-[1.35rem] px-3.5 py-3 text-[15px] leading-relaxed shadow-sm",
              msg.role === "user"
                ? "bg-gradient-to-br from-primary to-[hsl(320_70%_38%)] text-primary-foreground rounded-br-md"
                : "border border-white/[0.08] bg-black/45 text-foreground/95 rounded-bl-md backdrop-blur-md",
            )}
          >
            {msg.imageUrl ? (
              <ImageMessage
                imageUrl={msg.imageUrl}
                prompt={msg.imagePrompt || "Generated image"}
                onImageClick={() => onImageClick(msg)}
                companionName={companion.name}
                onSaveBackup={
                  msg.generatedImageId && onSaveImageBackup
                    ? () => onSaveImageBackup(msg.generatedImageId!)
                    : undefined
                }
                backupSaved={msg.savedToPersonalGallery}
                backupBusy={Boolean(msg.generatedImageId && savingBackupImageId === msg.generatedImageId)}
              />
            ) : (
              <div className="flex flex-col gap-2 min-w-0">
                <div className="flex items-start gap-2">
                  <p
                    className={cn(
                      "whitespace-pre-wrap flex-1 min-w-0 break-words",
                      msg.role === "assistant" && "leading-[1.7] text-foreground/92",
                    )}
                  >
                    {msg.content}
                  </p>
                  {msg.role === "assistant" && onTtsClick ? (
                    <button
                      type="button"
                      onClick={() => onTtsClick(msg)}
                      className={cn(
                        "shrink-0 mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-primary hover:bg-white/[0.1] transition-colors touch-manipulation",
                        ttsPlayingId === msg.id && "ring-1 ring-primary/50",
                      )}
                      title="Play voice"
                      aria-label="Play companion voice"
                    >
                      {ttsLoadingId === msg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>
                {msg.role === "user" &&
                imageGenPending &&
                imageGenPending.userMessageId === msg.id &&
                onConfirmPendingImage ? (
                  <button
                    type="button"
                    onClick={() => onConfirmPendingImage()}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(255,45,123,0.2)] ring-1 ring-white/10 hover:bg-black/55 disabled:opacity-40 transition-colors"
                  >
                    {pendingImageButtonLabel}
                  </button>
                ) : null}
              </div>
            )}

            {msg.lovenseCommand && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
                <Zap className="h-3 w-3 shrink-0" />
                {hasDevice ? (
                  <>
                    {labelForLovenseCmd(msg.lovenseCommand as Record<string, unknown>)}:{" "}
                    {String((msg.lovenseCommand as { command?: unknown }).command)} at{" "}
                    {(msg.lovenseCommand as { intensity?: number }).intensity}%
                    <span className="text-accent ml-1">✓ Sent</span>
                  </>
                ) : (
                  <>
                    Device: {String((msg.lovenseCommand as { command?: unknown }).command)} at{" "}
                    {(msg.lovenseCommand as { intensity?: number }).intensity}%
                    <span className="text-muted-foreground ml-1">(Connect device to activate)</span>
                  </>
                )}
              </div>
            )}

            {msg.imageUrl && msg.generatedImageId ? (
              <div className="mt-2 space-y-1">
                <div className="px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs">
                  ✓ In {companion.name}&apos;s gallery
                </div>
                {msg.savedToPersonalGallery ? (
                  <div className="px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[11px]">
                    ✓ Also saved to your personal vault
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {msg.role === "user" ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-muted/50 text-[11px] font-semibold text-foreground">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
          ) : null}
        </motion.div>
      ))}

      {loading ? (
        <ChatTypingIndicator companionName={companion.name} isImageRequest={isImageRequest(inputSnapshot)} />
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
}
