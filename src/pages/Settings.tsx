import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Save, Trash2, Shield, Loader2, Wifi, WifiOff, QrCode, Volume2, Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { disconnectToy, getToys, type LovenseToy } from "@/lib/lovense";
import { useLovensePairing } from "@/hooks/useLovensePairing";
import { useWindowVisibleRefresh } from "@/hooks/useWindowVisibleRefresh";
import { LovensePairingQrBlock } from "@/components/toy/LovensePairingQrBlock";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TTS_UX_LABELS, TTS_UX_VOICE_IDS, resolveUxVoiceId } from "@/lib/ttsVoicePresets";
import { dispatchRequestInstallHint, getVapidPublicKey, needsInstallForIosWebPush } from "@/lib/pwaCallAlerts";
import {
  countWebPushSubscriptionsForUser,
  subscribeCurrentDeviceToWebPush,
  unsubscribeCurrentDeviceWebPush,
} from "@/lib/webPushUserRegistration";
import { minutesToTimeInputValue, timeInputValueToMinutes } from "@/lib/callNotifyWindow";

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [safeWord, setSafeWord] = useState(() => localStorage.getItem("lustforge-safeword") || "RED");
  const [intensityLimit, setIntensityLimit] = useState(() => parseInt(localStorage.getItem("lustforge-intensity") || "100"));
  const [deviceUid, setDeviceUid] = useState("");
  /** Empty = no global override (each companion / relationship voice applies). */
  const [ttsGlobalVoice, setTtsGlobalVoice] = useState("");
  const [callNotifyWindowEnabled, setCallNotifyWindowEnabled] = useState(false);
  const [callNotifyStartMin, setCallNotifyStartMin] = useState(540);
  const [callNotifyEndMin, setCallNotifyEndMin] = useState(1320);
  const [callNotifyTz, setCallNotifyTz] = useState(() =>
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  );
  const [saving, setSaving] = useState(false);
  const [linkedToys, setLinkedToys] = useState<LovenseToy[]>([]);
  const [pushCount, setPushCount] = useState(0);
  const [pushBusy, setPushBusy] = useState(false);

  const refreshLinkedToys = useCallback(async (userId: string) => {
    const toys = await getToys(userId);
    setLinkedToys(toys);
  }, []);

  const refreshPushCount = useCallback(async (userId: string) => {
    setPushCount(await countWebPushSubscriptionsForUser(userId));
  }, []);

  const loadProfileSettings = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select(
        "device_uid, tts_voice_global_override, call_notify_window_enabled, call_notify_tz, call_notify_start_min, call_notify_end_min",
      )
      .eq("user_id", userId)
      .single();
    if (data?.device_uid) setDeviceUid(data.device_uid);
    else setDeviceUid("");
    const g = data?.tts_voice_global_override;
    setTtsGlobalVoice(typeof g === "string" && g.trim() ? resolveUxVoiceId(g) : "");
    setCallNotifyWindowEnabled(Boolean(data?.call_notify_window_enabled));
    setCallNotifyStartMin(
      typeof data?.call_notify_start_min === "number" && Number.isFinite(data.call_notify_start_min)
        ? data.call_notify_start_min
        : 540,
    );
    setCallNotifyEndMin(
      typeof data?.call_notify_end_min === "number" && Number.isFinite(data.call_notify_end_min)
        ? data.call_notify_end_min
        : 1320,
    );
    const tz = data?.call_notify_tz;
    setCallNotifyTz(
      typeof tz === "string" && tz.trim()
        ? tz.trim()
        : typeof window !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC",
    );
  }, []);

  const {
    qrImageUrl,
    isLoading: pairingLoading,
    startPairing,
    cancelPairing,
    lastError: pairingError,
    setLastError: setPairingError,
  } = useLovensePairing(user?.id, {
    onConnected: () => {
      if (!user?.id) return;
      void loadProfileSettings(user.id);
      void refreshLinkedToys(user.id);
      toast.success("Lovense linked — you’re ready for haptics in chat.");
    },
  });

  useEffect(() => {
    if (!pairingError) return;
    toast.error(pairingError);
    setPairingError(null);
  }, [pairingError, setPairingError]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      void loadProfileSettings(session.user.id);
      void refreshLinkedToys(session.user.id);
      void refreshPushCount(session.user.id);
    });
  }, [navigate, refreshLinkedToys, loadProfileSettings, refreshPushCount]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const id = hash === "device-connection" || hash === "voice-call-alerts" ? hash : null;
    if (!id) return;
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  useWindowVisibleRefresh(
    () => {
      if (!user?.id) return;
      void loadProfileSettings(user.id);
      void refreshLinkedToys(user.id);
      void refreshPushCount(user.id);
    },
    Boolean(user?.id),
  );

  const handleEnableCallPush = async () => {
    if (!user) return;
    if (!getVapidPublicKey()) {
      toast.error("Call alerts aren’t available in this build yet.");
      return;
    }
    if (needsInstallForIosWebPush()) {
      toast.message("Install for the best call alerts", {
        description: "On iPhone, add LustForge to your Home Screen from Safari — then alerts can reach you when the browser is closed.",
      });
      dispatchRequestInstallHint();
    }
    setPushBusy(true);
    try {
      const r = await subscribeCurrentDeviceToWebPush();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("This device is registered for call alerts.");
      await refreshPushCount(user.id);
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisableCallPush = async () => {
    if (!user) return;
    setPushBusy(true);
    try {
      await unsubscribeCurrentDeviceWebPush();
      toast.success("Call alerts removed for this browser profile.");
      await refreshPushCount(user.id);
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const ok = await disconnectToy(user.id);
    if (ok) {
      setDeviceUid("");
      setLinkedToys([]);
    } else {
      toast.error("Failed to disconnect devices");
    }
  };

  const hasLinkedDevice = Boolean(deviceUid?.trim()) || linkedToys.length > 0;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      localStorage.setItem("lustforge-safeword", safeWord);
      localStorage.setItem("lustforge-intensity", intensityLimit.toString());
      const override = ttsGlobalVoice.trim() ? resolveUxVoiceId(ttsGlobalVoice) : null;
      const tzSave =
        callNotifyWindowEnabled && !callNotifyTz.trim()
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : callNotifyTz.trim() || null;
      const { error } = await supabase
        .from("profiles")
        .update({
          tts_voice_global_override: override,
          call_notify_window_enabled: callNotifyWindowEnabled,
          call_notify_tz: tzSave,
          call_notify_start_min: callNotifyStartMin,
          call_notify_end_min: callNotifyEndMin,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Preferences saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm("Are you sure? This will delete ALL your chat history across all companions.")) return;

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to clear history");
    } else {
      toast.success("Chat history cleared");
    }
  };

  const vapidConfigured = Boolean(getVapidPublicKey());
  const callAlertsOnDevice = pushCount > 0;

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8 pb-mobile-nav relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-gothic text-3xl font-bold text-foreground mb-2">Preferences</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Safety, voice, call alerts, toys, and privacy — keep your vault tuned the way you like.
          </p>

          {/* Safety */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Safety & Consent
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1">Safe Word</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Type this in any chat to immediately stop all activity and device control.
                </p>
                <input
                  type="text"
                  value={safeWord}
                  onChange={(e) => setSafeWord(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-destructive transition-colors"
                  placeholder="e.g., RED"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">
                  Device Intensity Limit: <span className="text-primary font-bold">{intensityLimit}%</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Maximum intensity AI companions can send to your device.
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensityLimit}
                  onChange={(e) => setIntensityLimit(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Off</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>Max</span>
                </div>
              </div>
            </div>
          </div>

          {/* Voice (TTS) */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              Voice
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground mb-4">
              Choose one voice for every chat, or leave it off and set voice per companion in each chat&apos;s voice
              menu.
            </p>
            <label className="block text-sm text-foreground mb-2">Read-aloud voice default</label>
            <Select
              value={ttsGlobalVoice.trim() ? ttsGlobalVoice : "__off__"}
              onValueChange={(v) => setTtsGlobalVoice(v === "__off__" ? "" : v)}
            >
              <SelectTrigger className="w-full border-border bg-muted/40">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__off__">Off — use each companion&apos;s voice</SelectItem>
                {TTS_UX_VOICE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {TTS_UX_LABELS[id]} — all chats
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Your models — coming soon */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your models
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground mb-3">
              Soon you&apos;ll be able to plug in your own LLMs and creative stacks for a truly custom forge. For now,
              LustForge runs on our tuned companion stack — sit tight.
            </p>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Coming soon
            </span>
          </div>

          {/* Voice call alerts */}
          <div id="voice-call-alerts" className="rounded-xl border border-border bg-card p-6 mb-6 scroll-mt-24">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Voice call alerts
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground mb-4">
              Receive seductive voice calls and notifications from your companions even when LustForge is in the
              background.
            </p>

            {!vapidConfigured ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-white/10 bg-muted/30 px-3 py-2">
                Call alerts aren&apos;t available in this build yet.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor="call-alerts-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                      Let companions reach me anytime
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      {callAlertsOnDevice ? "This device is registered for alerts." : "This device is not registered."}
                    </p>
                  </div>
                  <Switch
                    id="call-alerts-toggle"
                    checked={callAlertsOnDevice}
                    disabled={pushBusy}
                    onCheckedChange={(on) => {
                      if (on) void handleEnableCallPush();
                      else void handleDisableCallPush();
                    }}
                  />
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/15 px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Only alert me during these hours</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Outside this window we won&apos;t ring your devices — you can still open the app anytime.
                      </p>
                    </div>
                    <Switch
                      checked={callNotifyWindowEnabled}
                      onCheckedChange={(v) => {
                        setCallNotifyWindowEnabled(v);
                        if (v && !callNotifyTz.trim()) {
                          setCallNotifyTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
                        }
                      }}
                    />
                  </div>
                  {callNotifyWindowEnabled ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <input
                          type="time"
                          className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                          value={minutesToTimeInputValue(callNotifyStartMin)}
                          onChange={(e) => {
                            const m = timeInputValueToMinutes(e.target.value);
                            if (m != null) setCallNotifyStartMin(m);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Until</Label>
                        <input
                          type="time"
                          className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                          value={minutesToTimeInputValue(callNotifyEndMin)}
                          onChange={(e) => {
                            const m = timeInputValueToMinutes(e.target.value);
                            if (m != null) setCallNotifyEndMin(m);
                          }}
                        />
                      </div>
                      <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                        Times use <span className="text-foreground/90 font-medium">{callNotifyTz}</span>. Tap save
                        below after changing the window.
                      </p>
                    </div>
                  ) : null}
                </div>

                {needsInstallForIosWebPush() ? (
                  <button
                    type="button"
                    onClick={() => dispatchRequestInstallHint()}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Best on iPhone: add LustForge to your Home Screen (tap for steps)
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Device Connection */}
          <div id="device-connection" className="rounded-xl border border-border bg-card p-6 mb-6 scroll-mt-24">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              {hasLinkedDevice ? (
                <Wifi className="h-5 w-5 text-accent" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              Device connection (Lovense)
            </h2>

            {hasLinkedDevice ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Linked toys receive patterns from chat, companion profiles, and the toy hub —{" "}
                  <strong className="text-foreground">same behavior on mobile PWA and PC</strong>. Disconnect to remove
                  all links from this account.
                </p>
                <div className="space-y-2">
                  {linkedToys.map((t) => (
                    <div
                      key={t.rowId}
                      className="flex gap-3 rounded-xl border border-white/[0.08] bg-black/30 p-3"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                        <img src={t.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{t.type}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/80 truncate" title={t.id}>
                          {t.id}
                        </p>
                      </div>
                    </div>
                  ))}
                  {linkedToys.length === 0 && deviceUid ? (
                    <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
                      Primary device id: <span className="font-mono text-foreground/90">{deviceUid}</span>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void startPairing()}
                  disabled={pairingLoading || Boolean(qrImageUrl)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/40 text-primary text-sm hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4" />
                  Add another device
                </button>
                <LovensePairingQrBlock
                  qrImageUrl={qrImageUrl}
                  loading={pairingLoading}
                  onCancel={cancelPairing}
                />
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-colors"
                >
                  <WifiOff className="h-4 w-4" />
                  Disconnect all devices
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Generate a QR code, then scan it with the <strong className="text-foreground">Lovense Remote</strong>{" "}
                  app (not the browser). Your phone bridges the toy to LustForge. Once linked,{" "}
                  <strong className="text-foreground">toy control is the same on mobile PWA and on PC</strong> — only
                  the QR step is awkward on a single phone (see note under the code).
                </p>
                <LovensePairingQrBlock
                  qrImageUrl={qrImageUrl}
                  loading={pairingLoading}
                  onCancel={cancelPairing}
                />
                {!qrImageUrl ? (
                  <button
                    type="button"
                    onClick={() => void startPairing()}
                    disabled={pairingLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    {pairingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Connect device (show QR)
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-4">Privacy</h2>
            <div className="space-y-3">
              <button
                onClick={handleClearHistory}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Chat History
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save preferences
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
