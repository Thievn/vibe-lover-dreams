import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";

export type GenerateProfileLoopVideoBody = {
  companionId?: string;
  motionNotes?: string;
  tokenCost?: number;
  sourceGeneratedImageId?: string;
  /** Returned from the first invoke; client polls with only `jobId` until the video is ready. */
  jobId?: string;
  /** Server-only: re-attach latest gallery / job MP4 to profile (see syncProfileLoopVideoToProfile). */
  action?: "sync";
};

export type ProfileLoopPollStatus = "starting" | "rendering" | "saving" | "complete";

const PROFILE_LOOP_INVOKE_TIMEOUT_MS = 90_000;
const PROFILE_LOOP_WALL_CLOCK_MS = 12 * 60_000;
const PROFILE_LOOP_POLL_MAX = 150;

export function profileLoopJobStorageKey(companionId: string): string {
  return `profile-loop-job:${companionId.trim()}`;
}

export function saveProfileLoopJobId(companionId: string, jobId: string): void {
  try {
    sessionStorage.setItem(profileLoopJobStorageKey(companionId), jobId.trim());
  } catch {
    /* ignore */
  }
}

export function clearProfileLoopJobId(companionId: string): void {
  try {
    sessionStorage.removeItem(profileLoopJobStorageKey(companionId));
  } catch {
    /* ignore */
  }
}

export function loadProfileLoopJobId(companionId: string): string | null {
  try {
    const v = sessionStorage.getItem(profileLoopJobStorageKey(companionId))?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function hasPendingProfileLoopJob(companionId: string): boolean {
  return Boolean(loadProfileLoopJobId(companionId));
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

/**
 * Invokes `generate-profile-loop-video`. Long xAI renders run as **async jobs** (short Edge invocations);
 * this helper polls until `phase === "complete"` or legacy `{ success, publicUrl }`.
 */
export async function invokeGenerateProfileLoopVideo(
  body: GenerateProfileLoopVideoBody,
  options?: {
    headers?: Record<string, string>;
    onPollStatus?: (status: ProfileLoopPollStatus) => void;
    signal?: AbortSignal;
  },
): Promise<{ success: true; publicUrl?: string; durationSeconds?: number }> {
  const onPollStatus = options?.onPollStatus;
  const signal = options?.signal;
  const startedAt = Date.now();
  let nextBody: Record<string, unknown> = { ...body };
  let pollPhase: ProfileLoopPollStatus = "starting";

  const companionId = typeof body.companionId === "string" ? body.companionId.trim() : "";

  for (let i = 0; i < PROFILE_LOOP_POLL_MAX; i++) {
    if (signal?.aborted) {
      throw new Error("Profile loop video cancelled.");
    }
    if (Date.now() - startedAt > PROFILE_LOOP_WALL_CLOCK_MS) {
      const jobId = typeof nextBody.jobId === "string" ? nextBody.jobId : loadProfileLoopJobId(companionId);
      if (jobId && companionId) saveProfileLoopJobId(companionId, jobId);
      throw new Error(
        "Profile loop video is still rendering after 12 minutes — reopen this profile to resume, or wait and tap Sync.",
      );
    }

    const { data, error } = await invokeProfileLoopVideoOnce(nextBody, {
      headers: options?.headers,
      signal,
    });

    if (profileLoopVideoResponseSucceeded(data)) {
      onPollStatus?.("complete");
      if (companionId) clearProfileLoopJobId(companionId);
      return data as { success: true; publicUrl?: string; durationSeconds?: number };
    }

    const d = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    if (d && d.success === true && d.phase === "poll" && typeof d.jobId === "string") {
      nextBody = { jobId: d.jobId };
      if (companionId) saveProfileLoopJobId(companionId, d.jobId);
      pollPhase = i === 0 ? "starting" : pollPhase === "starting" ? "rendering" : "saving";
      onPollStatus?.(pollPhase);
      const wait =
        typeof d.pollAfterMs === "number" && Number.isFinite(d.pollAfterMs) && d.pollAfterMs > 200
          ? Math.min(15_000, Math.floor(d.pollAfterMs))
          : 4000;
      await sleep(wait);
      if (pollPhase === "starting") pollPhase = "rendering";
      continue;
    }

    if (error) {
      const jobId = typeof nextBody.jobId === "string" ? nextBody.jobId : null;
      if (jobId && companionId && /timed out/i.test(error.message)) {
        saveProfileLoopJobId(companionId, jobId);
        throw new Error(
          `${error.message} Reopen this profile to resume job ${jobId.slice(0, 8)}…`,
        );
      }
      throw new Error(await getEdgeFunctionInvokeMessage(error, data));
    }
    const errMsg = d?.error;
    if (typeof errMsg === "string" && errMsg.trim()) {
      if (companionId) clearProfileLoopJobId(companionId);
      throw new Error(errMsg.trim());
    }
    throw new Error("Profile loop video did not return success.");
  }

  const jobId = typeof nextBody.jobId === "string" ? nextBody.jobId : null;
  if (jobId && companionId) saveProfileLoopJobId(companionId, jobId);
  throw new Error(
    "Profile loop video is still processing — reopen this companion profile to resume (the job may still complete server-side).",
  );
}

/** Resume polling a stored in-flight job (sessionStorage). Returns null if none. */
export async function resumePendingProfileLoopJob(
  companionId: string,
  options?: {
    headers?: Record<string, string>;
    onPollStatus?: (status: ProfileLoopPollStatus) => void;
    signal?: AbortSignal;
  },
): Promise<{ success: true; publicUrl?: string; durationSeconds?: number } | null> {
  const jobId = loadProfileLoopJobId(companionId);
  if (!jobId) return null;
  return invokeGenerateProfileLoopVideo({ jobId }, options);
}

/**
 * Starts profile loop generation and polls in the background (Nexus merge — do not await).
 */
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
