import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsxPath = path.join(root, "src", "pages", "chat", "_desktop_jsx.txt");
const out = path.join(root, "src", "pages", "chat", "ChatDesktopLayout.tsx");

const jsx = fs.readFileSync(jsxPath, "utf8");

const header = `import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer";
import { BreedingRitual } from "@/components/BreedingRitual";
import { ChatPremiumHeader } from "@/components/chat/ChatPremiumHeader";
import { ChatMessageThread } from "@/components/chat/ChatMessageThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatAmbientBackground } from "@/components/chat/ChatAmbientBackground";
import { ChatLeftHeroPanel } from "@/components/chat/ChatLeftHeroPanel";
import { ChatFloatingActionDock } from "@/components/chat/ChatFloatingActionDock";
import { ChatMobilePortraitSpotlight } from "@/components/chat/ChatMobilePortraitSpotlight";
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
import { inferChatMediaRoute } from "@/lib/chatVisualRouting";
import { LIVE_CALL_CREDITS_PER_MINUTE } from "@/lib/liveCallBilling";
import { setChatSessionMode as persistChatSessionMode } from "@/lib/chatSessionMode";
import { CHAT_IMAGE_LEWD_FC, CHAT_IMAGE_NUDE_FC, CHAT_MESSAGE_FC } from "@/lib/forgeEconomy";
import { CHAT_VIDEO_TOKEN_COST, FAB_SELFIE, setChatAutoSpendImages } from "@/lib/chatImageSettings";
import type { UseChatSessionControllerReturn } from "./useChatSessionController";

export function ChatDesktopLayout(props: UseChatSessionControllerReturn) {
  if (!props.companion) return null;
  const {
    companion,
    heartBursts,
    mood,
    affectionTier,
    affectionProgress,
    affectionProgressMax,
    tokensBalance,
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

`;

const footer = `
}
`;

fs.writeFileSync(out, header + jsx + footer, "utf8");
console.log("Wrote", out);
