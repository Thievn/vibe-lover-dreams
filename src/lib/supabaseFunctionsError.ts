/**
 * supabase.functions.invoke often sets `error` with a generic message while the
 * useful string lives in the JSON body (`{ error: "..." }`). Unwrap both.
 */
export async function messageFromFunctionsInvoke(
  error: unknown,
  data: unknown,
): Promise<string> {
  if (data && typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string" && d.error.trim()) {
      let msg = d.error.trim();
      if (typeof d.details === "string" && d.details.trim()) {
        msg += `: ${d.details.trim().slice(0, 280)}`;
      }
      return msg;
    }
  }

  const err = error as { message?: string; context?: { json?: () => Promise<unknown> } } | null;
  if (err?.context?.json) {
    try {
      const body = (await err.context.json()) as Record<string, unknown> | null;
      if (body && typeof body.error === "string" && body.error.trim()) {
        let msg = body.error.trim();
        if (typeof body.details === "string" && body.details.trim()) {
          msg += `: ${String(body.details).trim().slice(0, 280)}`;
        }
        return msg;
      }
    } catch {
      /* ignore */
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Edge function request failed.";
}
