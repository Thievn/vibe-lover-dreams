import type { RefObject } from "react";
import { motion } from "framer-motion";
import { Zap, Volume2, Loader2 } from "lucide-react";
import { ImageMessage } from "@/components/ImageMessage";
import { ChatInlineVideo } from "@/components/chat/ChatInlineVideo";
import type { Companion } from "@/data/companions";
import type { ChatMessage } from "@/components/chat/chatTypes";
import { ChatTypingIndicator } from "@/components/chat/ChatTypingIndicator";
import { cn } from "@/lib/utils";
import { parseAssistantDisplayContent } from "@/lib/chatSignatureBeat";
import { getChatTypingVariant } from "@/lib/chatTypingPersonality";

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
  /** Word-level highlight while TTS plays (proportional to audio progress). */
  ttsWordHighlight?: { messageId: string; wordIndex: number } | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onSaveImageBackup?: (generatedImageId: string) => void;
  savingBackupImageId?: string | null;
  /** Inline confirm before spending tokens on an image (when auto-spend is off). */
  imageGenPending?: { userMessageId: string; prompt: string } | null;
  onConfirmPendingImage?: () => void;
  pendingImageButtonLabel?: string;
  /** Companion / pattern is actively driving the toy (sustained session). */
  toyDriveActive?: boolean;
  onStopToyDrive?: () => void;
  /** Live Voice: tighter scroll padding + density so more messages fit above the dock. */
  compactThread?: boolean;
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
  ttsWordHighlight = null,
  messagesEndRef,
  onSaveImageBackup,
  savingBackupImageId,
  imageGenPending = null,
  onConfirmPendingImage,
  pendingImageButtonLabel = "Generate image",
  toyDriveActive = false,
  onStopToyDrive,
  compactThread = false,
}: Props) {
  const typingVariant = getChatTypingVariant(companion);

  return (
    <div
      className={cn(
        "relative z-[1] mx-auto min-h-0 w-full min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]",
        compactThread
          ? "space-y-3 scroll-pb-20 px-2.5 py-2 sm:px-4 md:space-y-4 md:py-3"
          : "space-y-4 scroll-pb-36 px-3 py-3 sm:px-5 md:space-y-5 md:py-5",
      )}
    >
      {/* Phase 4: toy session — persistent strip so “toy active” is obvious without breaking chat layout */}
      {toyDriveActive ? (
        <div className="sticky top-0 z-10 -mx-0.5 mb-1 flex items-center justify-center rounded-xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-950/90 via-primary/20 to-fuchsia-950/90 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest text-fuchsia-100/95 shadow-lg shadow-black/30">
          Toy session active
          {onStopToyDrive ? (
            <button
              type="button"
              onClick={() => onStopToyDrive()}
              className="ml-2 rounded-md border border-white/20 bg-black/30 px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal text-white/95 hover:bg-black/50"
            >
              Stop
            </button>
          ) : null}
        </div>
      ) : null}
      {messages.map((msg) => {
        const assistantDisplay =
          msg.role === "assistant" && !msg.imageUrl
            ? parseAssistantDisplayContent(msg.content)
            : { displayText: msg.content, signatureBeat: false };
        const bodyText = assistantDisplay.displayText;
        const readAlong =
          msg.role === "assistant" &&
          ttsWordHighlight &&
          ttsWordHighlight.messageId === msg.id &&
          ttsPlayingId === msg.id;
        const bodyWords = readAlong ? bodyText.split(/\s+/).filter(Boolean) : [];

        return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10, x: msg.role === "user" ? 14 : -12 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={cn(
            "flex min-w-0 gap-2",
            msg.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          {msg.role === "assistant" ? (
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/30 bg-zinc-900 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-white/5 sm:h-10 sm:w-10">
              {companionImageUrl ? (
                <img
                  src={companionImageUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-[10px] font-gothic font-bold text-white/95"
                  style={{
                    background: `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
                  }}
                >
                  {companion.name.charAt(0)}
                </div>
              )}
            </div>
          ) : null}

          <div
            className={cn(
              "min-w-0 max-w-[min(100%,38rem)] rounded-[1.25rem] px-4 py-[1.1rem] text-[15px] leading-relaxed break-words sm:px-5 sm:py-5",
              msg.role === "user"
                ? "rounded-br-[0.55rem] bg-gradient-to-br from-primary to-[hsl(320_70%_32%)] text-primary-foreground shadow-[0_4px_28px_rgba(0,0,0,0.35),0_0_40px_rgba(255,45,123,0.22),inset_0_1px_0_rgba(255,255,255,0.14)]"
                : assistantDisplay.signatureBeat
                  ? "border border-[#ff2d7b]/35 bg-gradient-to-br from-[#ff2d7b]/[0.15] via-fuchsia-950/25 to-[#00ffd4]/[0.08] text-foreground/95 rounded-bl-[0.55rem] backdrop-blur-md shadow-[0_0_44px_rgba(255,45,123,0.16),0_4px_24px_rgba(0,0,0,0.2)] ring-1 ring-[#ff2d7b]/25"
                  : "border border-white/[0.11] bg-[hsl(280_24%_7%/0.94)] text-foreground/95 rounded-bl-[0.55rem] backdrop-blur-md shadow-[0_2px_24px_rgba(0,0,0,0.32),0_0_50px_-12px_rgba(168,85,247,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]",
            )}
          >
            {msg.imageUrl ? (
              <ImageMessage
                imageUrl={msg.imageUrl}
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
                    {readAlong && bodyWords.length > 0 ? (
                      <>
                        {bodyWords.map((w, wi) => (
                          <span key={`${msg.id}-w-${wi}`}>
                            <span
                              className={cn(
                                "rounded-sm px-0.5 transition-colors duration-150",
                                wi <= (ttsWordHighlight?.wordIndex ?? -1) && "bg-primary/25 text-primary-foreground",
                              )}
                            >
                              {w}
                            </span>
                            {wi < bodyWords.length - 1 ? " " : null}
                          </span>
                        ))}
                      </>
                    ) : (
                      bodyText
                    )}
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
                    className="w-full rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-center text-xs font-semibold text-primary-foreground shadow-[0_0_14px_rgba(255,45,123,0.16)] ring-1 ring-white/10 hover:bg-black/50 disabled:opacity-40 transition-colors"
                  >
                    {pendingImageButtonLabel}
                  </button>
                ) : null}
              </div>
            )}

            {msg.lovenseCommand && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs flex flex-wrap items-center gap-2">
                <Zap className="h-3 w-3 shrink-0" />
                {hasDevice ? (
                  <>
                    <span>
                      {labelForLovenseCmd(msg.lovenseCommand as Record<string, unknown>)}:{" "}
                      {String((msg.lovenseCommand as { command?: unknown }).command)} at{" "}
                      {(msg.lovenseCommand as { intensity?: number }).intensity}%
                      <span className="text-accent ml-1">✓ Active</span>
                    </span>
                    {toyDriveActive && onStopToyDrive ? (
                      <button
                        type="button"
                        onClick={() => onStopToyDrive()}
                        className="ml-auto rounded-lg border border-accent/40 bg-accent/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent hover:bg-accent/25 touch-manipulation"
                      >
                        Stop toy
                      </button>
                    ) : null}
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

            {msg.videoUrl ? (
              <div className="mt-2">
                <ChatInlineVideo
                  videoUrl={msg.videoUrl}
                  companionName={companion.name}
                  showGalleryHint={Boolean(msg.generatedImageId)}
                  onSaveBackup={
                    msg.generatedImageId && onSaveImageBackup
                      ? () => onSaveImageBackup(msg.generatedImageId!)
                      : undefined
                  }
                  backupSaved={msg.savedToPersonalGallery}
                  backupBusy={Boolean(msg.generatedImageId && savingBackupImageId === msg.generatedImageId)}
                />
              </div>
            ) : null}

            {(msg.imageUrl && msg.generatedImageId) || (msg.videoUrl && msg.generatedImageId) ? (
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-500/15 bg-black/50 text-[11px] font-semibold text-foreground shadow-[0_0_20px_hsl(190_100%_50%_/_0.1)]">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
          ) : null}
        </motion.div>
        );
      })}

      {loading ? (
        <ChatTypingIndicator
          companionName={companion.name}
          isImageRequest={isImageRequest(inputSnapshot)}
          variant={typingVariant}
          companionImageUrl={companionImageUrl}
        />
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
}
