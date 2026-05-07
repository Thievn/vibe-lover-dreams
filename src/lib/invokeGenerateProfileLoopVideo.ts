import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";

export type GenerateProfileLoopVideoBody = {
  companionId: string;
  motionNotes?: string;
  tokenCost?: number;
  sourceGeneratedImageId?: string;
};

export function profileLoopVideoResponseSucceeded(data: unknown): data is {
  success: true;
  publicUrl?: string;
  durationSeconds?: number;
  source?: string;
} {
  return Boolean(data && typeof data === "object" && (data as { success?: unknown }).success === true);
}

/**
 * Invokes `generate-profile-loop-video`. Treats `{ success: true }` in **data** as success even when
 * `invoke()` returns a stale `error` (observed rarely with long-running Edge responses).
 */
export async function invokeGenerateProfileLoopVideo(
  body: GenerateProfileLoopVideoBody,
  options?: { headers?: Record<string, string> },
): Promise<{ success: true; publicUrl?: string; durationSeconds?: number }> {
  const { data, error } = await supabase.functions.invoke("generate-profile-loop-video", {
    body,
    ...(options?.headers ? { headers: options.headers } : {}),
  });
  if (profileLoopVideoResponseSucceeded(data)) {
    return data;
  }
  if (error) {
    throw new Error(await getEdgeFunctionInvokeMessage(error, data));
  }
  const errMsg = (data as { error?: string })?.error;
  if (typeof errMsg === "string" && errMsg.trim()) {
    throw new Error(errMsg.trim());
  }
  throw new Error("Profile loop video did not return success.");
}
