import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { syncProfileLoopVideoToProfile } from "@/lib/syncProfileLoopVideoToProfile";

export type GenerateProfileLoopVideoBody = {
  companionId?: string;
  motionNotes?: string;
  tokenCost?: number;
  sourceGeneratedImageId?: string;
  jobId?: string;
  action?: "sync" | "repair" | "cancel";
};

export type ProfileLoopPollStatus = "starting" | "rendering" | "saving" | "complete";

export type ProfileLoopVideoResult = {
  success: true;
  publicUrl?: string;
  durationSeconds?: number;
};

const PROFILE_LOOP_INVOKE_TIMEOUT_MS = 90_000;
const PROFILE_LOOP_WALL_CLOCK_MS = 12 * 60_000;
const PROFILE_LOOP_POLL_MAX = 150;
/** Auto-resume stored jobs only if younger than this (avoids zombie "Rendering…"). */
export const PROFILE_LOOP_RESUME_MAX_MS = 15 * 60_000;

type StoredProfileLoopJob = { jobId: string; companionId: string; savedAt: number };

/** One poll loop per companion — stops duplicate toasts and duplicate xAI status checks. */
const inFlightByCompanion = new Map<string, Promise<ProfileLoopVideoResult>>();

const resumeStartedGlobally = new Set<string>();

export function profileLoopJobStorageKey(companionId: string): string {
  return `profile-loop-job:${companionId.trim()}`;
}

export function profileLoopToastId(companionId: string): string {
  return `profile-loop-toast:${companionId.trim()}`;
}

function parseStoredJob(raw: string | null): StoredProfileLoopJob | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as { jobId?: string; companionId?: string; savedAt?: number };
    const jobId = typeof j.jobId === "string" ? j.jobId.trim() : "";
    const companionId = typeof j.companionId === "string" ? j.companionId.trim() : "";
    const savedAt =
      typeof j.savedAt === "number" && Number.isFinite(j.savedAt) ? j.savedAt : Date.now();
    if (jobId && companionId) return { jobId, companionId, savedAt };
  } catch {
    /* legacy: plain jobId string */
  }
  const legacy = raw.trim();
  if (/^[0-9a-f-]{36}$/i.test(legacy)) return null;
  return null;
}

function isStoredJobFresh(stored: StoredProfileLoopJob): boolean {
  return Date.now() - stored.savedAt < PROFILE_LOOP_RESUME_MAX_MS;
}

export function saveProfileLoopJobId(companionId: string, jobId: string): void {
  const cid = companionId.trim();
  const jid = jobId.trim();
  if (!cid || !jid) return;
  try {
    sessionStorage.setItem(
      profileLoopJobStorageKey(cid),
      JSON.stringify({ jobId: jid, companionId: cid, savedAt: Date.now() } satisfies StoredProfileLoopJob),
    );
  } catch {
    /* ignore */
  }
}

export function clearProfileLoopJobId(companionId: string): void {
  try {
    sessionStorage.removeItem(profileLoopJobStorageKey(companionId.trim()));
  } catch {
    /* ignore */
  }
}

export function loadProfileLoopJob(companionId: string): StoredProfileLoopJob | null {
  try {
    const raw = sessionStorage.getItem(profileLoopJobStorageKey(companionId.trim()));
    const parsed = parseStoredJob(raw);
    if (parsed) {
      if (!isStoredJobFresh(parsed)) {
        clearProfileLoopJobId(companionId.trim());
        return null;
      }
      return parsed;
    }
    if (raw?.trim() && /^[0-9a-f-]{36}$/i.test(raw.trim())) {
      return { jobId: raw.trim(), companionId: companionId.trim(), savedAt: Date.now() };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function loadProfileLoopJobId(companionId: string): string | null {
  return loadProfileLoopJob(companionId)?.jobId ?? null;
}

export function hasPendingProfileLoopJob(companionId: string): boolean {
  return Boolean(loadProfileLoopJob(companionId));
}

/** Strict Mode / remount guard for auto-resume. */
export function markProfileLoopResumeStarted(companionId: string): boolean {
  const cid = companionId.trim();
  if (!cid || resumeStartedGlobally.has(cid)) return false;
  resumeStartedGlobally.add(cid);
  return true;
}

export function clearProfileLoopResumeStarted(companionId: string): void {
  resumeStartedGlobally.delete(companionId.trim());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseInvokeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function profileLoopVideoResponseSucceeded(data: unknown): data is {
  success: true;
  publicUrl?: string;
  durationSeconds?: number;
  source?: string;
  phase?: string;
} {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.success !== true) return false;
  if (o.phase === "poll") return false;
  if (o.phase === "complete") return true;
  if (typeof o.publicUrl === "string" && o.publicUrl.trim().length > 0) return true;
  return false;
}

async function resolveBearer(headers?: Record<string, string>): Promise<string> {
  const fromHeaders = headers?.Authorization?.replace(/^Bearer\s+/i, "").trim();
  if (fromHeaders) return fromHeaders;
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token?.trim();
  if (!token) {
    throw new Error("Sign in again — profile loop video needs an active session.");
  }
  return token;
}

async function invokeProfileLoopVideoOnce(
  body: Record<string, unknown>,
  options?: { headers?: Record<string, string>; signal?: AbortSignal },
): Promise<{ data: unknown; error: Error | null }> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { data: null, error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }

  const url = `${base}/functions/v1/generate-profile-loop-video`;
  const bearer = await resolveBearer(options?.headers);
  const outerSignal = options?.signal;
  const controller = new AbortController();
  const tid = globalThis.setTimeout(() => controller.abort(), PROFILE_LOOP_INVOKE_TIMEOUT_MS);

  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onOuterAbort);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
        ...(options?.headers ?? {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    const data = parseInvokeJson(text);
    if (!res.ok) {
      const d = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      const msg =
        (typeof d?.error === "string" && d.error.trim()) ||
        text.trim() ||
        `Profile loop video failed (HTTP ${res.status}).`;
      return { data, error: new Error(msg) };
    }
    return { data, error: null };
  } catch (e: unknown) {
    if (outerSignal?.aborted) {
      return { data: null, error: new Error("Profile loop video cancelled.") };
    }
    if (e instanceof Error && e.name === "AbortError") {
      return {
        data: null,
        error: new Error(
          `Profile loop request timed out after ${PROFILE_LOOP_INVOKE_TIMEOUT_MS / 1000}s — will retry if a job is in progress.`,
        ),
      };
    }
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    globalThis.clearTimeout(tid);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}

async function finalizeProfileLoopSuccess(
  companionId: string,
  data: ProfileLoopVideoResult,
): Promise<ProfileLoopVideoResult> {
  clearProfileLoopJobId(companionId);
  let publicUrl = data.publicUrl?.trim();
  if (!publicUrl) {
    try {
      const synced = await syncProfileLoopVideoToProfile(companionId);
      if (synced.publicUrl?.trim()) publicUrl = synced.publicUrl.trim();
    } catch {
      /* sync is best-effort */
    }
  }
  return publicUrl ? { ...data, publicUrl } : data;
}

function resolveCompanionIdFromBody(body: GenerateProfileLoopVideoBody): string {
  const fromBody = typeof body.companionId === "string" ? body.companionId.trim() : "";
  if (fromBody) return fromBody;
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!jobId) return "";
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith("profile-loop-job:")) continue;
      const cid = key.slice("profile-loop-job:".length);
      const stored = loadProfileLoopJob(cid);
      if (stored?.jobId === jobId) return stored.companionId;
    }
  } catch {
    /* ignore */
  }
  return "";
}

async function runProfileLoopPoll(
  body: GenerateProfileLoopVideoBody,
  options?: {
    headers?: Record<string, string>;
    onPollStatus?: (status: ProfileLoopPollStatus) => void;
    signal?: AbortSignal;
  },
): Promise<ProfileLoopVideoResult> {
  const onPollStatus = options?.onPollStatus;
  const signal = options?.signal;
  const startedAt = Date.now();

  const resolvedCompanionId = resolveCompanionIdFromBody(body);

  let nextBody: Record<string, unknown> = { ...body };
  let pollPhase: ProfileLoopPollStatus = "starting";

  for (let i = 0; i < PROFILE_LOOP_POLL_MAX; i++) {
    if (signal?.aborted) {
      throw new Error("Profile loop video cancelled.");
    }
    if (Date.now() - startedAt > PROFILE_LOOP_WALL_CLOCK_MS) {
      const jobId =
        typeof nextBody.jobId === "string"
          ? nextBody.jobId
          : loadProfileLoopJobId(resolvedCompanionId);
      if (jobId && resolvedCompanionId) saveProfileLoopJobId(resolvedCompanionId, jobId);
      throw new Error(
        "Profile loop video is still rendering after 12 minutes — reopen this profile to resume.",
      );
    }

    const { data, error } = await invokeProfileLoopVideoOnce(nextBody, {
      headers: options?.headers,
      signal,
    });

    if (profileLoopVideoResponseSucceeded(data)) {
      onPollStatus?.("complete");
      const result = data as ProfileLoopVideoResult;
      if (resolvedCompanionId) {
        return finalizeProfileLoopSuccess(resolvedCompanionId, result);
      }
      return result;
    }

    const d = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    if (d && d.success === true && d.phase === "poll" && typeof d.jobId === "string") {
      nextBody = { jobId: d.jobId };
      if (resolvedCompanionId) saveProfileLoopJobId(resolvedCompanionId, d.jobId);
      const serverPhase = d.workerPhase;
      if (serverPhase === "saving") {
        pollPhase = "saving";
      } else if (serverPhase === "rendering") {
        pollPhase = "rendering";
      } else if (i === 0) {
        pollPhase = "starting";
      } else if (pollPhase === "starting") {
        pollPhase = "rendering";
      } else if (pollPhase === "rendering") {
        pollPhase = "saving";
      }
      onPollStatus?.(pollPhase);
      const wait =
        typeof d.pollAfterMs === "number" && Number.isFinite(d.pollAfterMs) && d.pollAfterMs > 200
          ? Math.min(15_000, Math.floor(d.pollAfterMs))
          : 4000;
      await sleep(wait);
      continue;
    }

    if (error) {
      const jobId = typeof nextBody.jobId === "string" ? nextBody.jobId : null;
      if (jobId && resolvedCompanionId && /timed out/i.test(error.message)) {
        saveProfileLoopJobId(resolvedCompanionId, jobId);
        throw new Error(`${error.message} Reopen this profile to resume.`);
      }
      throw new Error(await getEdgeFunctionInvokeMessage(error, data));
    }
    const errMsg = d?.error;
    if (typeof errMsg === "string" && errMsg.trim()) {
      if (resolvedCompanionId) clearProfileLoopJobId(resolvedCompanionId);
      throw new Error(errMsg.trim());
    }
    throw new Error("Profile loop video did not return success.");
  }

  const jobId = typeof nextBody.jobId === "string" ? nextBody.jobId : null;
  if (jobId && resolvedCompanionId) saveProfileLoopJobId(resolvedCompanionId, jobId);
  throw new Error(
    "Profile loop video is still processing — reopen this companion profile to resume.",
  );
}

/**
 * Invokes `generate-profile-loop-video`. Long xAI renders run as async jobs; polls until complete.
 * Only one poll loop runs per companion at a time (shared promise).
 */
export async function invokeGenerateProfileLoopVideo(
  body: GenerateProfileLoopVideoBody,
  options?: {
    headers?: Record<string, string>;
    onPollStatus?: (status: ProfileLoopPollStatus) => void;
    signal?: AbortSignal;
  },
): Promise<ProfileLoopVideoResult> {
  const companionId = resolveCompanionIdFromBody(body);

  if (companionId) {
    const existing = inFlightByCompanion.get(companionId);
    if (existing) {
      return existing;
    }
    const promise = runProfileLoopPoll(body, options).finally(() => {
      inFlightByCompanion.delete(companionId);
    });
    inFlightByCompanion.set(companionId, promise);
    return promise;
  }

  return runProfileLoopPoll(body, options);
}

export async function cancelProfileLoopVideo(
  companionId: string,
  jobId?: string,
): Promise<{ cancelled: boolean; message?: string }> {
  const cid = companionId.trim();
  if (!cid) return { cancelled: false, message: "Missing companion id." };
  const body: Record<string, unknown> = { companionId: cid, action: "cancel" };
  if (jobId?.trim()) body.jobId = jobId.trim();
  const { data, error } = await invokeProfileLoopVideoOnce(body);
  if (error) {
    throw new Error(await getEdgeFunctionInvokeMessage(error, data));
  }
  const d = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  clearProfileLoopJobId(cid);
  return {
    cancelled: d?.cancelled === true,
    message: typeof d?.message === "string" ? d.message : undefined,
  };
}

export async function resumePendingProfileLoopJob(
  companionId: string,
  options?: {
    headers?: Record<string, string>;
    onPollStatus?: (status: ProfileLoopPollStatus) => void;
    signal?: AbortSignal;
  },
): Promise<ProfileLoopVideoResult | null> {
  const stored = loadProfileLoopJob(companionId);
  if (!stored) return null;
  return invokeGenerateProfileLoopVideo(
    { jobId: stored.jobId, companionId: stored.companionId },
    options,
  );
}

export function startProfileLoopVideoInBackground(
  body: GenerateProfileLoopVideoBody,
  options?: {
    headers?: Record<string, string>;
    onPollStatus?: (status: ProfileLoopPollStatus) => void;
    onComplete?: (result: { publicUrl?: string }) => void;
    onError?: (message: string) => void;
  },
): void {
  void (async () => {
    try {
      const result = await invokeGenerateProfileLoopVideo(body, {
        headers: options?.headers,
        onPollStatus: options?.onPollStatus,
      });
      options?.onComplete?.({ publicUrl: result.publicUrl });
    } catch (e: unknown) {
      options?.onError?.(e instanceof Error ? e.message : "Loop video failed");
    }
  })();
}
