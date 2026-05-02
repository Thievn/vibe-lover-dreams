/**
 * Standalone phone-style xAI Realtime call: one portrait, timer + rate UI, in-call TTS
 * preview/save, optional Lovense strip, and lightweight phrase→toy sync from the assistant
 * final transcript.
 */
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanions, dbToCompanion, type DbCompanion } from "@/hooks/useCompanions";
import { useCompanionRelationship } from "@/hooks/useCompanionRelationship";
import { buildLiveCallRealtimeInstructions, type LiveCallMoodId } from "@/lib/buildLiveCallRealtimeInstructions";
import { invokeGrokVoiceClientSecret } from "@/lib/invokeGrokVoiceClientSecret";
import { startGrokRealtimeVoiceSession } from "@/lib/grokRealtimeVoiceSession";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { resolveLiveCallOptionBySlug } from "@/lib/resolveLiveCallOptionFromSlug";
import { resolveUxVoiceId, uxVoiceToXaiVoice, type TtsUxVoiceId, type XaiVoiceId } from "@/lib/ttsVoicePresets";
import { getToys, sendCommand, type LovenseToy } from "@/lib/lovense";
import { liveCallToyCommandFromAssistantLine } from "@/lib/liveCallToyFromAssistantSpeech";
import { fetchTtsSampleAudioUrl } from "@/lib/invokeGrokTtsSample";
import { LIVE_CALL_CREDITS_PER_MINUTE } from "@/lib/liveCallBilling";
import { spendForgeCoins } from "@/lib/forgeCoinsClient";
import { LiveCallPhoneShell, type LiveCallUiPhase } from "@/components/liveCall/LiveCallPhoneShell";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { notifyIncomingCallWithFallback } from "@/lib/companionCallNotifications";
import {
  LIVE_CALL_QUICK_ACTIONS,
  LIVE_CALL_QUICK_TAP_BREVITY,
  type LiveCallQuickActionId,
} from "@/lib/liveCallQuickActions";

type LocationState = { callOption?: LiveCallOption };

function pickPrimaryToy(toys: LovenseToy[]): LovenseToy | null {
  if (toys.length === 0) return null;
  return toys.find((t) => t.enabled !== false) ?? toys[0] ?? null;
}

const LiveCallPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const slugFromUrl = searchParams.get("call");
  const callOptionFromState = (location.state as LocationState | null)?.callOption ?? null;

  const { data: dbRows = [], isLoading } = useCompanions();
  const companion = useMemo(() => {
    if (!id) return null;
    const row = dbRows.find((r) => r.id === id);
    return row ? dbToCompanion(row) : null;
  }, [dbRows, id]);

  const dbComp: DbCompanion | null = useMemo(() => {
    if (!id) return null;
    return dbRows.find((r) => r.id === id) ?? null;
  }, [dbRows, id]);

  const callPortraitUrl = useMemo(
    () => (dbComp && id ? galleryStaticPortraitUrl(dbComp, id) : null),
    [dbComp, id],
  );

  const activeCallOption = useMemo(() => {
    if (callOptionFromState) return callOptionFromState;
    if (!companion || !id || !slugFromUrl) return null;
    return resolveLiveCallOptionBySlug(id, companion, slugFromUrl);
  }, [callOptionFromState, companion, id, slugFromUrl]);

  const { relationship, loading: relationshipLoading, refresh: refreshRelationship } = useCompanionRelationship(
    companion?.id ?? "",
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [toyList, setToyList] = useState<LovenseToy[]>([]);
  const [profileTtsGlobal, setProfileTtsGlobal] = useState<string | null>(null);
  const [callVoice, setCallVoice] = useState<TtsUxVoiceId | null>(null);
  const [saveVoicePending, setSaveVoicePending] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<TtsUxVoiceId | null>(null);

  const [phase, setPhase] = useState<LiveCallUiPhase>("preparing");
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const [statusLine, setStatusLine] = useState("Preparing…");
  const [liveElapsedSec, setLiveElapsedSec] = useState(0);
  const [callMood, setCallMood] = useState<LiveCallMoodId | null>(null);

  const stopRef = useRef<(() => void) | null>(null);
  const updateSessionRef = useRef<((p: { instructions?: string; voice?: XaiVoiceId }) => void) | null>(null);
  const sendUserTextRef = useRef<(text: string) => void>(() => {});
  const sessionStartedFor = useRef<string | null>(null);
  const callVoiceRef = useRef<TtsUxVoiceId>("velvet_whisper");
  const toyForSessionRef = useRef<LovenseToy | null>(null);
  const userIdRef = useRef<string | null>(null);
  const liveAtRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringNotifiedRef = useRef(false);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const list = await getToys(uid);
        setToyList(list);
        toyForSessionRef.current = pickPrimaryToy(list);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    void supabase
      .from("profiles")
      .select("tts_voice_global_override")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const g = data?.tts_voice_global_override;
        setProfileTtsGlobal(typeof g === "string" && g.trim() ? g.trim() : null);
      });
  }, [userId]);

  const effectiveUxVoice: TtsUxVoiceId = useMemo(() => {
    if (profileTtsGlobal) return resolveUxVoiceId(profileTtsGlobal);
    if (relationship?.tts_voice_preset) return resolveUxVoiceId(relationship.tts_voice_preset);
    if (dbComp?.tts_voice_preset) return resolveUxVoiceId(dbComp.tts_voice_preset);
    return "velvet_whisper";
  }, [profileTtsGlobal, relationship?.tts_voice_preset, dbComp?.tts_voice_preset]);

  const effectiveCallVoice = callVoice ?? effectiveUxVoice;

  useEffect(() => {
    callVoiceRef.current = effectiveCallVoice;
  }, [effectiveCallVoice]);

  const sessionCreditsEstimate = useMemo(
    () => (phase === "live" ? Math.max(0, Math.floor((liveElapsedSec / 60) * LIVE_CALL_CREDITS_PER_MINUTE)) : 0),
    [liveElapsedSec, phase],
  );

  useEffect(() => {
    if (phase === "preparing" || phase === "ringing" || phase === "connecting" || phase === "error" || phase === "ended") {
      liveAtRef.current = null;
      setLiveElapsedSec(0);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    if (liveAtRef.current == null) {
      liveAtRef.current = Date.now();
    }
    const t = window.setInterval(() => {
      const a = liveAtRef.current;
      if (a != null) {
        setLiveElapsedSec(Math.floor((Date.now() - a) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  /** Browsers may throttle `setInterval` in background tabs — resync on focus for an accurate on-call time. */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && phase === "live" && liveAtRef.current != null) {
        setLiveElapsedSec(Math.floor((Date.now() - liveAtRef.current) / 1000));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase]);

  const primaryToy = useMemo(() => pickPrimaryToy(toyList), [toyList]);
  const toyBarProps = useMemo(() => {
    if (!userId || !primaryToy) return null;
    return {
      userId,
      toyId: primaryToy.id,
      toyName: primaryToy.name,
      onToyUiDial: (dial: string) => {
        if (phaseRef.current !== "live") return;
        sendUserTextRef.current(dial);
      },
    };
  }, [userId, primaryToy]);

  useEffect(() => {
    ringNotifiedRef.current = false;
  }, [id, activeCallOption?.slug]);

  useEffect(() => {
    if (phase !== "ringing" || !companion || !id || !activeCallOption) return;
    if (ringNotifiedRef.current) return;
    ringNotifiedRef.current = true;
    void notifyIncomingCallWithFallback({
      companionName: companion.name,
      companionId: id,
      callSlug: activeCallOption.slug,
    });
  }, [phase, companion, id, activeCallOption]);

  const hangUp = useCallback(() => {
    const billSec =
      liveAtRef.current != null ? Math.max(0, Math.floor((Date.now() - liveAtRef.current) / 1000)) : 0;
    const minutesBilled = billSec > 0 ? Math.max(1, Math.ceil(billSec / 60)) : 0;
    const uid = userIdRef.current;
    const companionId = id;

    try {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      stopRef.current?.();
    } catch {
      /* ignore */
    }
    stopRef.current = null;
    updateSessionRef.current = null;
    sendUserTextRef.current = () => {};
    sessionStartedFor.current = null;
    setPhase("ended");
    if (uid && companionId && minutesBilled > 0) {
      const amount = minutesBilled * LIVE_CALL_CREDITS_PER_MINUTE;
      void spendForgeCoins(amount, "live_voice", `Live voice · ${minutesBilled} min`, {
        companion_id: companionId,
        bill_seconds: billSec,
      }).then((r) => {
        if (!r.ok) toast.error(r.err || "Could not record FC for this call.");
      });
    }
    if (id) navigate(`/companions/${id}`, { replace: true });
  }, [id, navigate]);

  const applyCallVoice = useCallback(
    async (v: TtsUxVoiceId) => {
      setCallVoice(v);
      callVoiceRef.current = v;
      if (phase === "live") {
        updateSessionRef.current?.({ voice: uxVoiceToXaiVoice(v) });
      }
      if (!userId || !id || !companion) {
        return;
      }
      if (profileTtsGlobal) {
        toast.info("A global voice override in Settings is active; relationship preset not saved.");
        return;
      }
      setSaveVoicePending(true);
      try {
        const { error } = await supabase.from("companion_relationships").upsert(
          {
            user_id: userId,
            companion_id: id,
            affection_level: relationship?.affection_level ?? 0,
            chat_affection_level: relationship?.chat_affection_level ?? 1,
            chat_affection_progress: relationship?.chat_affection_progress ?? 0,
            breeding_progress: relationship?.breeding_progress ?? 0,
            breeding_stage: relationship?.breeding_stage ?? 0,
            tts_voice_preset: v,
            last_interaction: new Date().toISOString(),
          },
          { onConflict: "user_id,companion_id" },
        );
        if (error) throw error;
        await refreshRelationship();
        toast.success("Voice updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save voice");
        throw e;
      } finally {
        setSaveVoicePending(false);
      }
    },
    [userId, id, companion, relationship, phase, profileTtsGlobal, refreshRelationship],
  );

  const onPreviewVoice = useCallback(async (v: TtsUxVoiceId) => {
    try {
      previewAudioRef.current?.pause();
      setPreviewLoadingId(v);
      const url = await fetchTtsSampleAudioUrl(v);
      const a = new Audio(url);
      a.onended = () => {
        setPreviewLoadingId((cur) => (cur === v ? null : cur));
        previewAudioRef.current = null;
      };
      a.onerror = () => {
        setPreviewLoadingId(null);
        previewAudioRef.current = null;
      };
      previewAudioRef.current = a;
      await a.play();
    } catch (e) {
      setPreviewLoadingId(null);
      throw e;
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    if (isLoading) return;
    if (!companion) return;
    if (callOptionFromState) return;
    if (!slugFromUrl) {
      navigate(`/companions/${id}`, { replace: true });
      return;
    }
    if (!activeCallOption) {
      navigate(`/companions/${id}`, { replace: true });
    }
  }, [id, isLoading, companion, slugFromUrl, callOptionFromState, activeCallOption, navigate]);

  useEffect(() => {
    if (!companion || !activeCallOption || !id || isLoading) return;
    if (relationshipLoading) return;

    const key = `${id}::${activeCallOption.slug}`;
    if (sessionStartedFor.current === key) return;
    sessionStartedFor.current = key;

    let cancelled = false;

    void (async () => {
      setPhase("preparing");
      setStatusLine("Securing line…");

      const [{ data: sess }, sec] = await Promise.all([
        supabase.auth.getSession(),
        invokeGrokVoiceClientSecret(),
      ]);
      if (cancelled) return;

      const uid = sess?.session?.user?.id ?? null;
      const toysPromise = uid ? getToys(uid) : Promise.resolve([] as LovenseToy[]);
      const toys = await toysPromise;
      if (cancelled) return;
      if (uid) {
        setUserId(uid);
        setToyList(toys);
        toyForSessionRef.current = pickPrimaryToy(toys);
      } else {
        toyForSessionRef.current = null;
      }

      const linked = toyForSessionRef.current != null;
      if ("error" in sec) {
        setPhase("error");
        setStatusLine(sec.error);
        sessionStartedFor.current = null;
        return;
      }

      setPhase("ringing");
      setStatusLine("Incoming call…");
      const ringMs = 1500 + Math.floor(Math.random() * 1000);
      await new Promise((r) => setTimeout(r, ringMs));
      if (cancelled) return;

      setPhase("connecting");
      setStatusLine("Connecting…");

      const instructions = buildLiveCallRealtimeInstructions(companion, activeCallOption, {
        hasLinkedToy: linked,
        callMood: null,
      });
      const voice = uxVoiceToXaiVoice(callVoiceRef.current);

      const api = startGrokRealtimeVoiceSession({
        clientSecret: sec.value,
        instructions,
        voice,
        onStatus: (s) => {
          setStatusLine(s);
          if (s.includes("Live")) {
            setPhase("live");
          }
          if (s.includes("Disconnected")) {
            setPhase("ended");
          }
        },
        onError: (e) => {
          setPhase("error");
          setStatusLine(e.message || "Voice error");
          sessionStartedFor.current = null;
        },
        onAssistantTranscriptDone: (text) => {
          const t = toyForSessionRef.current;
          const u = userIdRef.current;
          if (!t || !u) return;
          const cmd = liveCallToyCommandFromAssistantLine(String(text), { toyDeviceUid: t.id });
          if (cmd) {
            void sendCommand(u, cmd).catch(() => undefined);
          }
        },
      });
      stopRef.current = api.stop;
      updateSessionRef.current = api.updateSession;
      sendUserTextRef.current = api.sendUserTextPrompt;
    })();

    return () => {
      cancelled = true;
      try {
        stopRef.current?.();
      } catch {
        /* ignore */
      }
      stopRef.current = null;
      updateSessionRef.current = null;
      sendUserTextRef.current = () => {};
      sessionStartedFor.current = null;
    };
  }, [companion, activeCallOption, id, isLoading, relationshipLoading]);

  /** Re-steer session when in-call mood changes. */
  useEffect(() => {
    if (phase !== "live" || !companion || !activeCallOption) return;
    const linked = toyForSessionRef.current != null;
    const instructions = buildLiveCallRealtimeInstructions(companion, activeCallOption, {
      hasLinkedToy: linked,
      callMood,
    });
    updateSessionRef.current?.({ instructions });
  }, [callMood, phase, companion, activeCallOption]);

  const onQuickAction = useCallback((actionId: LiveCallQuickActionId) => {
    const row = LIVE_CALL_QUICK_ACTIONS.find((a) => a.id === actionId);
    if (!row) return;
    const text = `${row.prompt}\n\n${LIVE_CALL_QUICK_TAP_BREVITY}`.trim();
    sendUserTextRef.current(text);
  }, []);

  if (!id) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeCallOption) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoading || !companion) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <>
            <p className="text-muted-foreground">Companion not found.</p>
            <button type="button" className="text-primary underline" onClick={() => navigate("/")}>
              Home
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <LiveCallPhoneShell
      companion={companion}
      option={activeCallOption}
      phase={phase}
      statusLine={statusLine}
      onHangUp={hangUp}
      portraitUrl={callPortraitUrl}
      liveElapsedSec={liveElapsedSec}
      creditsPerMinute={LIVE_CALL_CREDITS_PER_MINUTE}
      sessionCreditsEstimate={sessionCreditsEstimate}
      callVoiceId={effectiveCallVoice}
      onCallVoiceChange={applyCallVoice}
      onPreviewVoice={onPreviewVoice}
      previewLoadingId={previewLoadingId}
      saveVoicePending={saveVoicePending}
      toyBar={toyBarProps}
      callMood={callMood}
      onCallMoodChange={setCallMood}
      onQuickAction={onQuickAction}
    />
  );
};

export default LiveCallPage;
