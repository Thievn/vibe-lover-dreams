import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanions, dbToCompanion, type DbCompanion } from "@/hooks/useCompanions";
import { useCompanionRelationship } from "@/hooks/useCompanionRelationship";
import { buildLiveCallRealtimeInstructions } from "@/lib/buildLiveCallRealtimeInstructions";
import { invokeGrokVoiceClientSecret } from "@/lib/invokeGrokVoiceClientSecret";
import { startGrokRealtimeVoiceSession } from "@/lib/grokRealtimeVoiceSession";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { resolveUxVoiceId, uxVoiceToXaiVoice, type TtsUxVoiceId } from "@/lib/ttsVoicePresets";
import { LiveCallPhoneShell, type LiveCallUiPhase } from "@/components/liveCall/LiveCallPhoneShell";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { Loader2 } from "lucide-react";

type LocationState = { callOption?: LiveCallOption };

const LiveCallPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const callOption = (location.state as LocationState | null)?.callOption;

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

  const { relationship, loading: relationshipLoading } = useCompanionRelationship(companion?.id ?? "");

  const [profileTtsGlobal, setProfileTtsGlobal] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) return;
      void supabase
        .from("profiles")
        .select("tts_voice_global_override")
        .eq("user_id", uid)
        .maybeSingle()
        .then(({ data }) => {
          const g = data?.tts_voice_global_override;
          setProfileTtsGlobal(typeof g === "string" && g.trim() ? g.trim() : null);
        });
    });
  }, []);

  const effectiveUxVoice: TtsUxVoiceId = useMemo(() => {
    if (profileTtsGlobal) return resolveUxVoiceId(profileTtsGlobal);
    if (relationship?.tts_voice_preset) return resolveUxVoiceId(relationship.tts_voice_preset);
    if (dbComp?.tts_voice_preset) return resolveUxVoiceId(dbComp.tts_voice_preset);
    return "velvet_whisper";
  }, [profileTtsGlobal, relationship?.tts_voice_preset, dbComp?.tts_voice_preset]);

  const [phase, setPhase] = useState<LiveCallUiPhase>("preparing");
  const [statusLine, setStatusLine] = useState("Preparing…");
  const stopRef = useRef<(() => void) | null>(null);
  const sessionStartedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!id || !callOption) {
      if (id) navigate(`/companions/${id}`, { replace: true });
      else navigate("/", { replace: true });
    }
  }, [id, callOption, navigate]);

  const hangUp = useCallback(() => {
    try {
      stopRef.current?.();
    } catch {
      /* ignore */
    }
    stopRef.current = null;
    sessionStartedFor.current = null;
    setPhase("ended");
    if (id) navigate(`/companions/${id}`, { replace: true });
  }, [id, navigate]);

  useEffect(() => {
    if (!companion || !callOption || !id || isLoading) return;
    if (relationshipLoading) return;

    const key = `${id}::${callOption.slug}`;
    if (sessionStartedFor.current === key) return;
    sessionStartedFor.current = key;

    let cancelled = false;

    void (async () => {
      setPhase("preparing");
      setStatusLine("Securing line…");
      const sec = await invokeGrokVoiceClientSecret();
      if (cancelled) return;
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

      const instructions = buildLiveCallRealtimeInstructions(companion, callOption);
      const voice = uxVoiceToXaiVoice(effectiveUxVoice);

      const api = startGrokRealtimeVoiceSession({
        clientSecret: sec.value,
        instructions,
        voice,
        onStatus: (s) => {
          setStatusLine(s);
          if (s.includes("Live")) setPhase("live");
          if (s.includes("Disconnected")) {
            setPhase("ended");
          }
        },
        onError: (e) => {
          setPhase("error");
          setStatusLine(e.message || "Voice error");
          sessionStartedFor.current = null;
        },
      });
      stopRef.current = api.stop;
    })();

    return () => {
      cancelled = true;
      try {
        stopRef.current?.();
      } catch {
        /* ignore */
      }
      stopRef.current = null;
      sessionStartedFor.current = null;
    };
  }, [companion, callOption, id, isLoading, navigate, relationshipLoading, effectiveUxVoice]);

  if (!id || !callOption) {
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
      option={callOption}
      phase={phase}
      statusLine={statusLine}
      onHangUp={hangUp}
      portraitUrl={callPortraitUrl}
    />
  );
};

export default LiveCallPage;
