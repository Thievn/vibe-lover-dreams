import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer";
import { BreedingRitual } from "@/components/BreedingRitual";
import { ChatPremiumHeader } from "@/components/chat/ChatPremiumHeader";
import { ChatMessageThread } from "@/components/chat/ChatMessageThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatAmbientBackground } from "@/components/chat/ChatAmbientBackground";
import { ChatLeftHeroPanel } from "@/components/chat/ChatLeftHeroPanel";
import { ChatQuickActionFab } from "@/components/chat/ChatQuickActionFab";
import { ChatSmartReplies } from "@/components/chat/ChatSmartReplies";
import { ChatDevicesCollapsible } from "@/components/chat/ChatDevicesCollapsible";
import { FloatingHeartsLayer } from "@/components/chat/FloatingHeartsLayer";
import { ChatVoiceSettingsSheet } from "@/components/chat/ChatVoiceSettingsSheet";
import { ChatSignatureMovesDropdown } from "@/components/chat/ChatSignatureMovesDropdown";
import { ChatModeToggle } from "@/components/chat/ChatModeToggle";
import { LiveVoicePanel } from "@/components/chat/LiveVoicePanel";
import { ToyHubPopover } from "@/components/toy/ToyHubPopover";
import { ChatGallerySheet } from "@/components/chat/ChatGallerySheet";
import { CHAT_IN_SESSION_VIDEO_CLIPS_COMING_SOON, inferChatMediaRoute } from "@/lib/chatVisualRouting";
import { LIVE_CALL_CREDITS_PER_MINUTE } from "@/lib/liveCallBilling";
import { setChatSessionMode as persistChatSessionMode } from "@/lib/chatSessionMode";
import { CHAT_IMAGE_LEWD_FC, CHAT_IMAGE_NUDE_FC } from "@/lib/forgeEconomy";
import { DailyFreeMessagesBar } from "@/components/chat/DailyFreeMessagesBar";
import { CHAT_VIDEO_TOKEN_COST, FAB_SELFIE, setChatAutoSpendImages } from "@/lib/chatImageSettings";
import { resolveBreedingRitualPartnerB } from "@/lib/breedingRitualPartner";
import { cn } from "@/lib/utils";
import type { UseChatSessionControllerReturn } from "./useChatSessionController";

export function ChatDesktopLayout(props: UseChatSessionControllerReturn) {
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
    headerAnimated,
    galleryImages,
    galleryImagesLoading,
    handlePortraitFromGallery,
    setInput,
    requestSimilarStillFromGallery,
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
    draftMediaRoute,
    imageSubmitTitle,
    videoSubmitTitle,
    handleMediaBarRequest,
    autoSpendChatImages,
    setAutoSpendChatImages,
    generateChatVideoClip,
    handleFabAction,
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
    handleEmergencyStopFromUi,
    input,
  } = props;

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#030208] text-foreground [color-scheme:dark]">
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
        onBack={() => {
          void handleEmergencyStop();
          const st = location.state as { from?: string; profileBackTarget?: string } | undefined;
          navigate(`/companions/${companion.id}`, {
            state: { from: st?.profileBackTarget ?? st?.from ?? "/discover" },
          });
        }}
        onEmergencyStop={() => void handleEmergencyStopFromUi()}
        onOpenGallery={user ? () => setGalleryOpen(true) : undefined}
        showHeroInLeftColumn
        sessionControls={
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
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

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <ChatLeftHeroPanel
            companion={companion}
            imageUrl={portraitStillUrl}
            headerAnimated={headerAnimated}
            onVoiceClick={() => setVoiceSettingsOpen(true)}
            images={galleryImages}
            loading={galleryImagesLoading}
            currentPortraitUrl={portraitStillUrl}
            onSetAsPortrait={handlePortraitFromGallery}
            onOpenFullGallery={() => setGalleryOpen(true)}
            onAddReferenceLine={(line) => {
              setInput((prev) => (prev?.trim() ? `${prev} ${line}` : line));
            }}
            onRequestSimilarStill={user ? requestSimilarStillFromGallery : undefined}
            hasGalleryUser={Boolean(user)}
          />

          <div className="relative mx-auto flex min-h-0 min-w-0 w-full max-w-md flex-1 flex-col xl:my-3 xl:mr-5 xl:max-w-lg xl:rounded-2xl xl:border xl:border-fuchsia-500/[0.12] xl:bg-[#050308]/40 xl:shadow-[0_0_80px_rgba(0,0,0,0.55)] xl:backdrop-blur-sm">
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
              <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive sm:px-4">
                Low Forge Coins! You have {tokensBalance} FC.{" "}
                <Link to="/buy-credits" className="font-medium underline">Top up</Link>
              </div>
            )}

            <div className="relative z-0 flex min-h-0 flex-1 flex-col">
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
                onStopToyDrive={() => void stopSustainedToy()}
                compactThread={sessionMode === "live_voice"}
                visualVariant="luxury"
              />
            </div>

            <div
              className={cn(
                "z-20 shrink-0 bg-gradient-to-t from-[#030208]/95 to-transparent px-2 sm:px-3",
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
              <div className="z-10 shrink-0 border-t border-white/[0.06] bg-gradient-to-b from-black/40 to-transparent px-2 pb-0 sm:px-3">
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
              className={
                sessionMode === "live_voice"
                  ? "z-20 shrink-0 bg-gradient-to-t from-[#030208] to-black/50 pb-[max(0.15rem,env(safe-area-inset-bottom))]"
                  : "z-20 shrink-0"
              }
            >
              <div className={sessionMode === "live_voice" ? "px-2 pb-0.5 sm:px-3" : "px-2 pb-1 sm:px-3"}>
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
        </div>
      </div>

      <ChatQuickActionFab
        luxury
        onAction={handleFabAction}
        isActionDisabled={(actionId) =>
          actionId === "vibration" && (!hasDevice || vibrationPatterns.length === 0)
        }
      />

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

      {/* Image Viewer Modal */}
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
