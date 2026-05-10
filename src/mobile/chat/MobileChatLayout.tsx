import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Image, LayoutGrid, Phone, ShieldAlert, Sparkles, Volume2 } from "lucide-react";
import { ImageViewer } from "@/components/ImageViewer";
import { BreedingRitual } from "@/components/BreedingRitual";
import { ChatPremiumHeader } from "@/components/chat/ChatPremiumHeader";
import { ChatMessageThread } from "@/components/chat/ChatMessageThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatAmbientBackground } from "@/components/chat/ChatAmbientBackground";
import { ChatSmartReplies } from "@/components/chat/ChatSmartReplies";
import { ChatDevicesCollapsible } from "@/components/chat/ChatDevicesCollapsible";
import { FloatingHeartsLayer } from "@/components/chat/FloatingHeartsLayer";
import { ChatVoiceSettingsSheet } from "@/components/chat/ChatVoiceSettingsSheet";
import { ChatSignatureMovesDropdown } from "@/components/chat/ChatSignatureMovesDropdown";
import { ChatModeToggle } from "@/components/chat/ChatModeToggle";
import { LiveVoicePanel } from "@/components/chat/LiveVoicePanel";
import { ToyHubPopover } from "@/components/toy/ToyHubPopover";
import { ChatGallerySheet } from "@/components/chat/ChatGallerySheet";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON, inferChatMediaRoute } from "@/lib/chatVisualRouting";
import { LIVE_CALL_CREDITS_PER_MINUTE } from "@/lib/liveCallBilling";
import { setChatSessionMode as persistChatSessionMode } from "@/lib/chatSessionMode";
import { CHAT_IMAGE_LEWD_FC, CHAT_IMAGE_NUDE_FC } from "@/lib/forgeEconomy";
import { DailyFreeMessagesBar } from "@/components/chat/DailyFreeMessagesBar";
import { CHAT_VIDEO_TOKEN_COST, FAB_SELFIE, setChatAutoSpendImages } from "@/lib/chatImageSettings";
import { resolveBreedingRitualPartnerB } from "@/lib/breedingRitualPartner";
import type { UseChatSessionControllerReturn } from "@/pages/chat/useChatSessionController";

export function MobileChatLayout(props: UseChatSessionControllerReturn) {
  const [toolsOpen, setToolsOpen] = useState(false);
  if (!props.companion) return null;

  const {
    companion,
    dbCompDisplay,
    breedingPartnerDb,
    heartBursts,
    mood,
    affectionTier,
    affectionProgress,
    affectionProgressMax,
    tokensBalance,
    chatDailyQuotaUi,
    isAdminUser,
    safeWord,
    navigate,
    location,
    user,
    setGalleryOpen,
    vibrationPatterns,
    vibrationPatternsLoading,
    hasDevice,
    loading,
    livePatternId,
    triggerCompanionVibration,
    sessionMode,
    setSessionMode,
    tokensBalanceRef,
    connectedToys,
    toysPanelLoading,
    pairingLoading,
    pairingQrUrl,
    cancelLovensePairing,
    refreshToys,
    handleConnectToy,
    handleDisconnectOneToy,
    handleToggleToyEnabled,
    activeToys,
    portraitStillUrl,
    galleryImages,
    galleryImagesLoading,
    handlePortraitFromGallery,
    setInput,
    relationship,
    toyUtilityBusy,
    handleTestToy,
    handleDisconnectToy,
    handleStopAll,
    handleStartBreedingRitual,
    primaryToyUid,
    selectPrimaryToy,
    sendingVibrationId,
    messages,
    userAvatarUrl,
    userInitials,
    setViewingImage,
    labelForLovenseCmd,
    handleTts,
    ttsLoadingId,
    ttsPlayingId,
    ttsWordHighlight,
    messagesEndRef,
    handleSaveImageBackup,
    savingBackupImageId,
    imageGenPending,
    confirmPendingImageGeneration,
    pendingImageButtonLabel,
    toyDriveActive,
    stopSustainedToy,
    smartSuggestions,
    sendMessage,
    liveVoiceElapsedSec,
    setLiveVoiceMicRecording,
    liveVoiceMicRecording,
    registerLiveRampAssistFeed,
    liveVoiceSendText,
    rampModeActive,
    setRampModeActive,
    rampPreset,
    handleRampPresetChange,
    prepareToyForRamp,
    liveVoiceStopTick,
    setVoiceSettingsOpen,
    goLiveCallFromChat,
    handleRampPill,
    handleEmergencyStopFromUi,
    draftMediaRoute,
    imageSubmitTitle,
    videoSubmitTitle,
    handleMediaBarRequest,
    autoSpendChatImages,
    setAutoSpendChatImages,
    generateChatVideoClip,
    voiceSettingsOpen,
    effectiveVoiceLabel,
    profileTtsGlobal,
    globalVoiceLabelForSheet,
    relationshipVoicePreset,
    saveRelationshipVoice,
    voicePresetSaving,
    ttsAutoplay,
    onTtsAutoplayChange,
    liveVoiceTtsAutoplay,
    onLiveVoiceTtsAutoplayChange,
    viewingImage,
    saveImageToCompanionGallery,
    saveImageToPersonalGallery,
    galleryOpen,
    showBreedingRitual,
    setShowBreedingRitual,
    handleBreedingComplete,
    handleEmergencyStop,
    input,
  } = props;

  const toolRow = (label: string, icon: ReactNode, onClick: () => void) => (
    <button
      type="button"
      onClick={() => {
        setToolsOpen(false);
        onClick();
      }}
      className={cn(
        "flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-black/40 px-4 text-left text-sm font-medium text-foreground",
        "active:scale-[0.99] touch-manipulation",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#030208] text-foreground [color-scheme:dark]">
      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.5]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 100% 70% at 50% -10%, rgba(147, 51, 234, 0.14), transparent 55%), radial-gradient(ellipse 80% 50% at 100% 100%, rgba(236, 72, 153, 0.08), transparent 50%)",
        }}
      />
      <FloatingHeartsLayer bursts={heartBursts} />

      <ChatPremiumHeader
        companion={companion}
        mood={mood}
        affectionTier={affectionTier}
        affectionProgress={affectionProgress}
        affectionProgressMax={affectionProgressMax}
        tokensBalance={tokensBalance}
        isAdminUser={isAdminUser}
        safeWord={safeWord}
        variant="luxurySlim"
        companionImageUrl={portraitStillUrl}
        onBack={() => {
          void handleEmergencyStop();
          const st = location.state as { from?: string; profileBackTarget?: string } | undefined;
          navigate(`/companions/${companion.id}`, {
            state: { from: st?.profileBackTarget ?? st?.from ?? "/discover" },
          });
        }}
        onEmergencyStop={() => void handleEmergencyStopFromUi()}
        onOpenGallery={user ? () => setGalleryOpen(true) : undefined}
        showHeroInLeftColumn={false}
        sessionControls={
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <ChatSignatureMovesDropdown
              companionName={companion.name}
              patterns={vibrationPatterns}
              patternsLoading={vibrationPatternsLoading}
              hasDevice={hasDevice}
              disabled={!user || loading}
              activePatternId={livePatternId}
              onTriggerPattern={(row) => void triggerCompanionVibration(row)}
            />
            <ChatModeToggle
              mode={sessionMode}
              onChange={(m) => {
                if (m === "live_voice" && !isAdminUser && tokensBalanceRef.current < LIVE_CALL_CREDITS_PER_MINUTE) {
                  toast.error(
                    `Live Voice bills ${LIVE_CALL_CREDITS_PER_MINUTE} FC per started minute (audio-first; same meter as full-screen Live Call). Classic includes 20 free text lines per UTC day — top up for live modes.`,
                    { action: { label: "Buy FC", onClick: () => navigate("/buy-credits") } },
                  );
                  return;
                }
                setSessionMode(m);
                persistChatSessionMode(m);
              }}
              disabled={!user}
            />
          </div>
        }
        rightSlot={
          user ? (
            <ToyHubPopover
              toys={connectedToys}
              loading={toysPanelLoading}
              pairingLoading={pairingLoading}
              pairingQrUrl={pairingQrUrl}
              onCancelPairing={cancelLovensePairing}
              onRefresh={refreshToys}
              onConnect={() => void handleConnectToy()}
              onDisconnectOne={(uid) => void handleDisconnectOneToy(uid)}
              onToggleEnabled={(uid, en) => void handleToggleToyEnabled(uid, en)}
            />
          ) : null
        }
        toyStatusLabel={
          connectedToys.length > 0
            ? `${activeToys.length} active${connectedToys.length > activeToys.length ? ` · ${connectedToys.length} link` : ""}`
            : "No toy"
        }
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <ChatDevicesCollapsible
          className="border-b border-fuchsia-500/[0.08] bg-[#050308]/55 backdrop-blur-xl"
          companionName={companion.name}
          connectedCount={connectedToys.length}
          activeCount={activeToys.length}
          affectionPct={relationship?.affection_level ?? 0}
          breedingStage={relationship?.breeding_stage ?? 0}
          hasDevice={hasDevice}
          pairingQrUrl={pairingQrUrl}
          toyUtilityBusy={toyUtilityBusy}
          pairingLoading={pairingLoading}
          onCancelPairing={cancelLovensePairing}
          onTestToy={() => void handleTestToy()}
          onDisconnectToy={() => void handleDisconnectToy()}
          onStopAll={() => void handleStopAll()}
          onConnectToy={() => void handleConnectToy()}
          onBreedingRitual={handleStartBreedingRitual}
          toys={activeToys}
          primaryToyId={primaryToyUid}
          onSelectPrimaryToy={selectPrimaryToy}
          patterns={vibrationPatterns}
          patternsLoading={vibrationPatternsLoading}
          sendingVibrationId={sendingVibrationId}
          activePatternId={livePatternId}
          onTriggerPattern={(row) => void triggerCompanionVibration(row)}
        />

        {!isAdminUser && tokensBalance < 100 && tokensBalance > 0 && (
          <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            Low Forge Coins! You have {tokensBalance} FC.{" "}
            <Link to="/buy-credits" className="font-medium underline">
              Top up
            </Link>
          </div>
        )}

        <div
          className={cn(
            "relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
            sessionMode === "live_voice" ? "pb-4" : "pb-8",
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <ChatAmbientBackground activityKey={messages.length} luxuryScanlines />
          <ChatMessageThread
            messages={messages}
            companion={companion}
            companionImageUrl={portraitStillUrl}
            userAvatarUrl={userAvatarUrl}
            userInitials={userInitials}
            loading={loading}
            isImageRequest={(t) => inferChatMediaRoute(t, false) !== "text"}
            inputSnapshot={input}
            hasDevice={hasDevice}
            onImageClick={setViewingImage}
            labelForLovenseCmd={labelForLovenseCmd}
            onTtsClick={handleTts}
            ttsLoadingId={ttsLoadingId}
            ttsPlayingId={ttsPlayingId}
            ttsWordHighlight={ttsWordHighlight}
            messagesEndRef={messagesEndRef}
            onSaveImageBackup={user ? handleSaveImageBackup : undefined}
            savingBackupImageId={savingBackupImageId}
            imageGenPending={imageGenPending}
            onConfirmPendingImage={() => void confirmPendingImageGeneration()}
            pendingImageButtonLabel={pendingImageButtonLabel}
            toyDriveActive={toyDriveActive}
            compactThread={sessionMode === "live_voice"}
            onStopToyDrive={() => void stopSustainedToy()}
            visualVariant="luxury"
          />
        </div>

        <div
          className={cn(
            "z-20 shrink-0 bg-gradient-to-t from-[#030208]/95 to-transparent px-2",
            sessionMode === "live_voice" ? "pb-0" : "pb-0.5",
          )}
        >
          <ChatSmartReplies
            suggestions={smartSuggestions}
            disabled={false}
            loading={loading}
            compact={sessionMode === "live_voice"}
            visualVariant="luxury"
            onPick={(s) => {
              setInput(s);
              void sendMessage(s);
            }}
          />
        </div>

        {sessionMode === "live_voice" ? (
          <div className="z-10 shrink-0 border-t border-white/[0.06] bg-gradient-to-b from-black/40 to-transparent px-2 pb-0">
            <LiveVoicePanel
              companionName={companion.name}
              disabled={!isAdminUser && tokensBalance < LIVE_CALL_CREDITS_PER_MINUTE}
              busy={loading}
              creditsPerMinute={LIVE_CALL_CREDITS_PER_MINUTE}
              sessionElapsedSec={liveVoiceElapsedSec}
              onMicRecordingChange={setLiveVoiceMicRecording}
              voiceInteractiveLocked={!liveVoiceMicRecording}
              onRegisterRampAssistFeed={registerLiveRampAssistFeed}
              onSendText={liveVoiceSendText}
              rampModeActive={rampModeActive}
              onRampModeActiveChange={setRampModeActive}
              rampPreset={rampPreset}
              onRampPresetChange={handleRampPresetChange}
              hasDevice={hasDevice}
              userId={user?.id}
              primaryToyUid={primaryToyUid}
              toyIntensityPercent={parseInt(localStorage.getItem("lustforge-intensity") || "100", 10) || 100}
              prepareToyForRamp={prepareToyForRamp}
              safeWord={safeWord}
              emergencyStopTick={liveVoiceStopTick}
              onVoiceSettingsClick={() => setVoiceSettingsOpen(true)}
            />
          </div>
        ) : null}

        <div
          className={cn(
            "z-20 shrink-0 border-t border-fuchsia-500/10 bg-gradient-to-t from-[#030208] via-[#050308]/95 to-transparent",
            sessionMode === "live_voice" ? "pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]" : "pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className={sessionMode === "live_voice" ? "px-2 pb-0.5" : "px-2 pb-1"}>
            <DailyFreeMessagesBar
              visible={Boolean(user)}
              remainingFree={chatDailyQuotaUi.remainingFree}
              nextLineFc={chatDailyQuotaUi.nextMessageFc}
              isAdminUser={isAdminUser}
              className="border-fuchsia-500/12 bg-black/35 py-1.5 text-[9px] shadow-none sm:text-[10px]"
            />
          </div>
          <ChatComposer
            input={input}
            onChange={setInput}
            onSubmit={() => void sendMessage()}
            disabled={false}
            loading={loading}
            placeholder={
              sessionMode === "live_voice"
                ? `Type to ${companion.name} or use the mic above…`
                : `Message ${companion.name}… stills or just talk`
            }
            mediaDraftKind={draftMediaRoute}
            isAdminUser={isAdminUser}
            tokensBalance={tokensBalance}
            tokenCost={chatDailyQuotaUi.nextMessageFc}
            textQuotaRemaining={user ? chatDailyQuotaUi.remainingFree : null}
            imageTokenCost={CHAT_IMAGE_NUDE_FC}
            videoTokenCost={CHAT_VIDEO_TOKEN_COST}
            imageSubmitTitle={imageSubmitTitle}
            videoSubmitTitle={videoSubmitTitle}
            safeWord={safeWord}
            companionName={companion.name}
            onMediaRequest={handleMediaBarRequest}
            onStyledStillRequest={(p) =>
              void sendMessage(p.userLine, {
                imageGenerationPrompt: FAB_SELFIE[p.tier].imagePrompt,
                styledSceneExtension: p.sceneExtension,
                bypassImageConfirmation: true,
                imageRequestFromMenu: true,
              })
            }
            mediaMenuDisabled={Boolean(user && !isAdminUser && tokensBalance < CHAT_IMAGE_LEWD_FC)}
            videoMenuDisabled={
              CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON ||
              Boolean(user && !isAdminUser && tokensBalance < CHAT_VIDEO_TOKEN_COST)
            }
            chatImageLewdFc={CHAT_IMAGE_LEWD_FC}
            videoClipFc={CHAT_VIDEO_TOKEN_COST}
            autoSpendEnabled={autoSpendChatImages}
            onAutoSpendChange={(enabled) => {
              setAutoSpendChatImages(enabled);
              setChatAutoSpendImages(companion.id, enabled);
            }}
            userLoggedIn={Boolean(user)}
            photoDockLayout={sessionMode === "live_voice" ? "live_voice" : "full"}
            onGalleryClipRequest={(p) => void generateChatVideoClip({ mood: p.mood, motionHint: p.motionHint })}
            visualVariant="luxury"
          />
        </div>
      </div>

      <Button
        type="button"
        size="icon"
        onClick={() => setToolsOpen(true)}
        className={cn(
          "fixed z-[45] h-10 w-10 rounded-full border border-fuchsia-500/25 bg-black/50 text-fuchsia-200/90 shadow-[0_0_20px_rgba(236,72,153,0.2)] backdrop-blur-md transition-opacity hover:opacity-100 sm:h-11 sm:w-11",
          "bottom-[max(4.5rem,calc(3.75rem+env(safe-area-inset-bottom,0px)))] right-2.5 opacity-80 sm:bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] sm:right-3",
          "touch-manipulation",
        )}
        aria-label="Chat tools"
      >
        <LayoutGrid className="h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" />
      </Button>

      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#08060c] px-4 pb-8 pt-4">
          <SheetHeader className="text-left">
            <SheetTitle className="font-gothic text-lg">Tools</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-2">
            {toolRow(
              "Live call",
              <Phone className="h-5 w-5" />,
              () => {
                void goLiveCallFromChat();
              },
            )}
            {toolRow("Ramp / live voice focus", <Sparkles className="h-5 w-5" />, () => void handleRampPill())}
            {toolRow("Gallery", <Image className="h-5 w-5" />, () => {
              if (user) setGalleryOpen(true);
              else void navigate("/auth", { state: { from: location.pathname } });
            })}
            {toolRow("Voice & TTS", <Volume2 className="h-5 w-5" />, () => setVoiceSettingsOpen(true))}
            {toolRow("Emergency stop", <ShieldAlert className="h-5 w-5 text-destructive" />, () => void handleEmergencyStopFromUi())}
          </div>
        </SheetContent>
      </Sheet>

      <ChatVoiceSettingsSheet
        open={voiceSettingsOpen}
        onOpenChange={setVoiceSettingsOpen}
        companionName={companion.name}
        effectiveLabel={effectiveVoiceLabel}
        globalVoiceActive={Boolean(profileTtsGlobal?.trim())}
        globalVoiceLabel={globalVoiceLabelForSheet}
        relationshipPreset={relationshipVoicePreset}
        onSaveRelationshipPreset={saveRelationshipVoice}
        saving={voicePresetSaving}
        ttsAutoplay={ttsAutoplay}
        onTtsAutoplayChange={onTtsAutoplayChange}
        liveVoiceTtsAutoplay={liveVoiceTtsAutoplay}
        onLiveVoiceTtsAutoplayChange={onLiveVoiceTtsAutoplayChange}
      />

      {viewingImage && viewingImage.imageUrl && viewingImage.generatedImageId && (
        <ImageViewer
          imageUrl={viewingImage.imageUrl}
          imageId={viewingImage.generatedImageId}
          companionName={companion.name}
          prompt={viewingImage.imagePrompt || "Generated image"}
          companionGalleryAutoSaved={viewingImage.savedToCompanionGallery !== false}
          onSaveToCompanionGallery={saveImageToCompanionGallery}
          onSaveToPersonalGallery={saveImageToPersonalGallery}
          onClose={() => setViewingImage(null)}
        />
      )}

      {user ? (
        <ChatGallerySheet
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          companionName={companion.name}
          images={galleryImages}
          loading={galleryImagesLoading}
          currentPortraitUrl={portraitStillUrl}
          onSetAsPortrait={handlePortraitFromGallery}
        />
      ) : null}

      {showBreedingRitual && companion && dbCompDisplay && (
        <BreedingRitual
          parentA={dbCompDisplay}
          parentB={resolveBreedingRitualPartnerB(dbCompDisplay, breedingPartnerDb)}
          onClose={() => setShowBreedingRitual(false)}
          onComplete={handleBreedingComplete}
          userId={user?.id}
          hasConnectedToys={connectedToys.length > 0}
        />
      )}
    </div>
  );
}
