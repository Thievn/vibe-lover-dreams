import { supabase } from "@/integrations/supabase/client";
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const PROFILE_LOOP_POLL_MAX = 200;

/**
 * Invokes `generate-profile-loop-video`. Long xAI renders run as **async jobs** (short Edge invocations);
 * this helper polls until `phase === "complete"` or legacy `{ success, publicUrl }`.
 *
 * Treats `{ success: true, phase: "complete" }` in **data** as success even when
 * `invoke()` returns a stale `error` (observed rarely with long-running Edge responses).
 */
export async function invokeGenerateProfileLoopVideo(
  body: GenerateProfileLoopVideoBody,
  options?: {
    headers?: Record<string, string>;
    onPollStatus?: (status: ProfileLoopPollStatus) => void;
  },
): Promise<{ success: true; publicUrl?: string; durationSeconds?: number }> {
  const headers = options?.headers;
  const onPollStatus = options?.onPollStatus;
  let nextBody: Record<string, unknown> = { ...body };
  let pollPhase: ProfileLoopPollStatus = "starting";

  for (let i = 0; i < PROFILE_LOOP_POLL_MAX; i++) {
    const { data, error } = await supabase.functions.invoke("generate-profile-loop-video", {
      body: nextBody,
      ...(headers ? { headers } : {}),
    });

    if (profileLoopVideoResponseSucceeded(data)) {
      onPollStatus?.("complete");
      return data as { success: true; publicUrl?: string; durationSeconds?: number };
    }

    const d = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    if (d && d.success === true && d.phase === "poll" && typeof d.jobId === "string") {
      nextBody = { jobId: d.jobId };
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
      throw new Error(await getEdgeFunctionInvokeMessage(error, data));
    }
    const errMsg = d?.error;
    if (typeof errMsg === "string" && errMsg.trim()) {
      throw new Error(errMsg.trim());
    }
    throw new Error("Profile loop video did not return success.");
  }

  throw new Error(
    "Profile loop video is still processing after many checks — wait a minute and open the companion profile (the job may still complete server-side).",
  );
}
