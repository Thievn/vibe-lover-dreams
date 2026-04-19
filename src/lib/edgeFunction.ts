function messageFromJsonBody(o: Record<string, unknown>): string | null {
  const err = o.error;
  const msg = o.message;
  const details = o.details;
  const detail = o.detail;
  if (typeof err === "string" && err.trim()) {
    if (typeof details === "string" && details.trim()) {
      return `${err.trim()}: ${details.trim()}`;
    }
    if (typeof detail === "string" && detail.trim()) {
      return `${err.trim()}: ${detail.trim().slice(0, 600)}`;
    }
    return err.trim();
  }
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return null;
}

/**
 * When an Edge Function returns non-2xx, `invoke()` returns `data: null` and
 * `FunctionsHttpError` with `context` set to the fetch `Response` (see @supabase/functions-js).
 * The JSON error body must be read from that Response with `.json()` / `.text()`.
 */
export async function getEdgeFunctionInvokeMessage(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === "object") {
    const fromData = messageFromJsonBody(data as Record<string, unknown>);
    if (fromData) return fromData;
  }

  const e = error as { message?: string; context?: unknown };
  const ctx = e?.context;
  if (ctx instanceof Response) {
    try {
      const clone = ctx.clone();
      const ct = (clone.headers.get("content-type") || "").split(";")[0].trim();
      if (ct === "application/json") {
        const j = (await clone.json()) as Record<string, unknown>;
        const fromJson = messageFromJsonBody(j);
        if (fromJson) return fromJson;
      } else {
        const text = (await clone.text()).trim();
        if (text.length > 0 && text.length < 800) return text;
      }
    } catch {
      /* ignore parse errors */
    }
  }

  if (e?.message) return e.message;
  return "Edge function request failed";
}
