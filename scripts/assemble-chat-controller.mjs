import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const chatTsx = path.join(root, "src", "pages", "Chat.tsx");
const extract = path.join(root, "src", "pages", "chat", "_extract_body.txt");
const out = path.join(root, "src", "pages", "chat", "useChatSessionController.ts");

const headerLines = fs.readFileSync(chatTsx, "utf8").split(/\r?\n/).slice(0, 146);
const header = headerLines.join("\n");

let body = fs.readFileSync(extract, "utf8");
body = body
  .replace(/^const Chat = \(\) => \{/, "export function useChatSessionController() {")
  .replace(
    /const freeNsfwUsed = user \? getFreeNsfwImagesUsed\(user\.id, companion\.id\) : 0;/,
    "const freeNsfwUsed = user && companion ? getFreeNsfwImagesUsed(user.id, companion.id) : 0;",
  );

const ret = `
  return {
    id,
    navigate,
    location,
    companionsLoading,
    forgeLookupBusy,
    companion,
    dbComp,
    basePortraitUrl,
    headerAnimated,
    messages,
    input,
    setInput,
    loading,
    user,
    tokensBalance,
    forgeBalanceReady,
    safeWord,
    connectedToys,
    primaryToyUid,
    toysPanelLoading,
    viewingImage,
    setViewingImage,
    showBreedingRitual,
    setShowBreedingRitual,
    voiceSettingsOpen,
    setVoiceSettingsOpen,
    voicePresetSaving,
    profileTtsGlobal,
    ttsAutoplay,
    liveVoiceTtsAutoplay,
    smartSuggestions,
    heartBursts,
    messagesEndRef,
    ttsLoadingId,
    ttsPlayingId,
    sendingVibrationId,
    livePatternId,
    toyDriveActive,
    sessionMode,
    setSessionMode,
    rampModeActive,
    setRampModeActive,
    rampPreset,
    liveVoiceStopTick,
    liveVoiceElapsedSec,
    liveVoiceMicRecording,
    setLiveVoiceMicRecording,
    toyUtilityBusy,
    historyReady,
    galleryOpen,
    setGalleryOpen,
    savingBackupImageId,
    imageGenPending,
    autoSpendChatImages,
    setAutoSpendChatImages,
    portraitStillUrl,
    galleryImages,
    galleryImagesLoading,
    isAdminUser,
    mood,
    affectionTier,
    affectionProgress,
    affectionProgressMax,
    effectiveVoiceLabel,
    relationshipVoicePreset,
    globalVoiceLabelForSheet,
    onTtsAutoplayChange,
    onLiveVoiceTtsAutoplayChange,
    userAvatarUrl,
    userInitials,
    activeToys,
    hasDevice,
    selectPrimaryToy,
    vibrationPatterns,
    vibrationPatternsLoading,
    stopSustainedToy,
    prepareToyForRamp,
    handleRampPresetChange,
    relationship,
    queryClient,
    handlePortraitFromGallery,
    refreshToys,
    pairingQrUrl,
    pairingLoading,
    cancelLovensePairing,
    handleToggleToyEnabled,
    handleConnectToy,
    handleDisconnectOneToy,
    triggerCompanionVibration,
    handleTestToy,
    handleDisconnectToy,
    handleStopAll,
    handleStartBreedingRitual,
    labelForLovenseCmd,
    draftMediaRoute,
    imageSubmitTitle,
    videoSubmitTitle,
    pendingImageButtonLabel,
    handleTts,
    handleSaveImageBackup,
    confirmPendingImageGeneration,
    sendMessage,
    registerLiveRampAssistFeed,
    liveVoiceSendText,
    handleRampPill,
    goLiveCallFromChat,
    handleEmergencyStopFromUi,
    handleEmergencyStop,
    handleFabAction,
    handleMediaBarRequest,
    generateChatVideoClip,
    saveRelationshipVoice,
    saveImageToCompanionGallery,
    saveImageToPersonalGallery,
    handleBreedingComplete,
    tokensBalanceRef,
    requestSimilarStillFromGallery,
  };
}`;

const full = `${header}

${body}
${ret}
`;

fs.writeFileSync(out, full, "utf8");
console.log("Wrote", out);
