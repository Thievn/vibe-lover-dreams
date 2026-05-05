/** PostgREST errors from `supabase.from(...)` are plain objects, not always `instanceof Error`. */
export function formatSupabaseError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    if (typeof o.message === "string" && o.message.trim()) {
      const parts: string[] = [o.message.trim()];
      if (typeof o.details === "string" && o.details.trim()) parts.push(o.details.trim());
      if (typeof o.hint === "string" && o.hint.trim()) parts.push(o.hint.trim());
      if (typeof o.code === "string" && o.code.trim()) parts.push(`code ${o.code.trim()}`);
      return parts.join(" · ");
    }
  }
  if (e instanceof Error) return e.message;
  if (typeof e === "string" && e.trim()) return e.trim();
  try {
    const s = String(e).trim();
    if (s && s !== "[object Object]") return s;
  } catch {
    /* ignore */
  }
  return "Request failed";
}
