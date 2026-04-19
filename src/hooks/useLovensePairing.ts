import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";

const POLL_MS = 3000;
const MAX_ATTEMPTS = 60;

export type LovensePairingStatus = "idle" | "loading" | "awaiting_scan" | "polling";

/**
 * Starts Lovense LAN QR pairing and polls until `profiles.device_uid` or `user_lovense_toys` updates.
 */
export function useLovensePairing(
  userId: string | undefined,
  options?: {
    /** Called when a new link is detected (toy row or primary device uid). */
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
  /** Set while a QR session is active; callback deletes this row on success (see `lovense-callback`). */
  const activePairingTokenRef = useRef<string | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
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

  const startPolling = useCallback(() => {
    clearPoll();
    setStatus("polling");
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      if (!userId) return;
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        clearPoll();
        activePairingTokenRef.current = null;
        setQrImageUrl(null);
        setStatus("idle");
        setLastError("Pairing timed out. Try again — keep Lovense Remote open after scanning.");
        return;
      }

      const pairingToken = activePairingTokenRef.current;
      if (pairingToken) {
        const { data: pairingRow, error: pairingErr } = await supabase
          .from("lovense_pairings")
          .select("id")
          .eq("pairing_token", pairingToken)
          .maybeSingle();

        if (!pairingErr && pairingRow === null) {
          clearPoll();
          activePairingTokenRef.current = null;
          setQrImageUrl(null);
          setStatus("idle");
          setLastError(null);
          onConnectedRef.current?.();
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
        clearPoll();
        activePairingTokenRef.current = null;
        setQrImageUrl(null);
        setStatus("idle");
        setLastError(null);
        onConnectedRef.current?.();
      }
    }, POLL_MS);
  }, [userId, clearPoll]);

  const startPairing = useCallback(async () => {
    if (!userId) return;
    setLastError(null);
    setQrImageUrl(null);
    activePairingTokenRef.current = null;
    setStatus("loading");
    await fetchBaseline();

    try {
      const { data, error } = await supabase.functions.invoke("lovense-qrcode", { body: {} });
      if (error) {
        setStatus("idle");
        setLastError(await messageFromFunctionsInvoke(error, data));
        return;
      }
      const url =
        data && typeof data === "object" && "qrCodeUrl" in data
          ? (data as { qrCodeUrl?: string }).qrCodeUrl?.trim()
          : undefined;
      const pairingToken =
        data && typeof data === "object" && "pairingToken" in data
          ? String((data as { pairingToken?: string }).pairingToken ?? "").trim()
          : "";
      if (pairingToken) activePairingTokenRef.current = pairingToken;
      if (!url) {
        setStatus("idle");
        setLastError("No QR image returned from server.");
        return;
      }
      setQrImageUrl(url);
      setStatus("awaiting_scan");
      startPolling();
    } catch (e) {
      setStatus("idle");
      setLastError(e instanceof Error ? e.message : "Could not start pairing.");
    }
  }, [userId, fetchBaseline, startPolling]);

  const cancelPairing = useCallback(() => {
    clearPoll();
    activePairingTokenRef.current = null;
    setQrImageUrl(null);
    setStatus("idle");
    setLastError(null);
  }, [clearPoll]);

  useEffect(() => () => clearPoll(), [clearPoll]);

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
