import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 90;

function unwrapInvokeJson(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      const p = JSON.parse(data) as unknown;
      return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  return null;
}

function readPairingPayload(data: unknown): { qrCodeUrl?: string; pairingToken?: string } {
  const obj = unwrapInvokeJson(data);
  if (!obj) return {};
  const qrCodeUrl =
    typeof obj.qrCodeUrl === "string"
      ? obj.qrCodeUrl.trim()
      : typeof obj.qr_code_url === "string"
        ? obj.qr_code_url.trim()
        : undefined;
  const pairingToken =
    typeof obj.pairingToken === "string"
      ? obj.pairingToken.trim()
      : typeof obj.pairing_token === "string"
        ? obj.pairing_token.trim()
        : undefined;
  return { qrCodeUrl, pairingToken };
}

export type LovensePairingStatus = "idle" | "loading" | "awaiting_scan" | "polling";

/**
 * Starts Lovense LAN QR pairing and completes when the callback writes toys / deletes the pairing row.
 */
export function useLovensePairing(
  userId: string | undefined,
  options?: {
    onConnected?: () => void;
  },
) {
  const onConnectedRef = useRef(options?.onConnected);
  onConnectedRef.current = options?.onConnected;
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<LovensePairingStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baselineDeviceUidRef = useRef<string | null>(null);
  const baselineToyCountRef = useRef<number>(0);
  const activePairingTokenRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const completedThisSessionRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const tearDownRealtime = useCallback(() => {
    if (realtimeChannelRef.current) {
      void supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, []);

  const fetchBaseline = useCallback(async () => {
    if (!userId) return;
    const [{ data: prof }, { count }] = await Promise.all([
      supabase.from("profiles").select("device_uid").eq("user_id", userId).maybeSingle(),
      supabase.from("user_lovense_toys").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    baselineDeviceUidRef.current = typeof prof?.device_uid === "string" ? prof.device_uid.trim() : null;
    baselineToyCountRef.current = typeof count === "number" ? count : 0;
  }, [userId]);

  const completeSession = useCallback(() => {
    if (completedThisSessionRef.current) return;
    completedThisSessionRef.current = true;
    clearPoll();
    tearDownRealtime();
    activePairingTokenRef.current = null;
    setQrImageUrl(null);
    setStatus("idle");
    setLastError(null);
    onConnectedRef.current?.();
  }, [clearPoll, tearDownRealtime]);

  const attachToyRealtime = useCallback(
    (uid: string) => {
      tearDownRealtime();
      completedThisSessionRef.current = false;
      const ch = supabase
        .channel(`lovense-toys-${uid}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_lovense_toys",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            completeSession();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_lovense_toys",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            completeSession();
          },
        )
        .subscribe();
      realtimeChannelRef.current = ch;
    },
    [tearDownRealtime, completeSession],
  );

  const startPolling = useCallback(() => {
    clearPoll();
    setStatus("polling");
    let attempts = 0;

    const tick = async () => {
      if (!userId || completedThisSessionRef.current) return;
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        clearPoll();
        tearDownRealtime();
        activePairingTokenRef.current = null;
        setQrImageUrl(null);
        setStatus("idle");
        setLastError(
          "Pairing timed out. Confirm the Lovense developer callback URL points to this project’s lovense-callback function, then try again.",
        );
        return;
      }

      const pairingToken = activePairingTokenRef.current;
      if (pairingToken) {
        const { data: pairingRows, error: pairingErr } = await supabase
          .from("lovense_pairings")
          .select("id")
          .eq("pairing_token", pairingToken)
          .limit(1);

        if (!pairingErr && (!pairingRows || pairingRows.length === 0)) {
          completeSession();
          return;
        }
      }

      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from("profiles").select("device_uid").eq("user_id", userId).maybeSingle(),
        supabase.from("user_lovense_toys").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const uid = typeof prof?.device_uid === "string" ? prof.device_uid.trim() : "";
      const toyCount = typeof count === "number" ? count : 0;
      const baseUid = baselineDeviceUidRef.current ?? "";
      const baseCount = baselineToyCountRef.current;

      const uidNew = uid && uid !== baseUid;
      const toysNew = toyCount > baseCount;

      if (uidNew || toysNew) {
        completeSession();
      }
    };

    void tick();
    pollRef.current = setInterval(() => void tick(), POLL_MS);
  }, [userId, clearPoll, tearDownRealtime, completeSession]);

  const startPairing = useCallback(async () => {
    if (!userId) return;
    setLastError(null);
    setQrImageUrl(null);
    activePairingTokenRef.current = null;
    completedThisSessionRef.current = false;
    setStatus("loading");
    await fetchBaseline();

    try {
      const { data, error } = await supabase.functions.invoke("lovense-qrcode", { body: {} });
      if (error) {
        setStatus("idle");
        setLastError(await messageFromFunctionsInvoke(error, data));
        return;
      }
      const parsed = readPairingPayload(data);
      const url = parsed.qrCodeUrl;
      const pairingToken = parsed.pairingToken ?? "";
      if (pairingToken) activePairingTokenRef.current = pairingToken;
      if (!url) {
        setStatus("idle");
        setLastError("No QR image returned from server.");
        return;
      }
      setQrImageUrl(url);
      setStatus("awaiting_scan");
      attachToyRealtime(userId);
      startPolling();
    } catch (e) {
      setStatus("idle");
      setLastError(e instanceof Error ? e.message : "Could not start pairing.");
    }
  }, [userId, fetchBaseline, startPolling, attachToyRealtime]);

  const cancelPairing = useCallback(() => {
    clearPoll();
    tearDownRealtime();
    activePairingTokenRef.current = null;
    completedThisSessionRef.current = false;
    setQrImageUrl(null);
    setStatus("idle");
    setLastError(null);
  }, [clearPoll, tearDownRealtime]);

  useEffect(
    () => () => {
      clearPoll();
      tearDownRealtime();
    },
    [clearPoll, tearDownRealtime],
  );

  return {
    qrImageUrl,
    status,
    lastError,
    setLastError,
    isLoading: status === "loading",
    isPolling: status === "polling" || status === "awaiting_scan",
    startPairing,
    cancelPairing,
  };
}
