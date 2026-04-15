export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://lustforge.app";
export const AUTH_EMAIL_FROM = import.meta.env.VITE_AUTH_EMAIL_FROM ?? "donotreply@lustforge.app";

/**
 * Gmail / Googlemail: dots in the local part are ignored for delivery.
 * Normalizes so lust.forge.app@gmail.com matches lustforgeapp@gmail.com for admin allowlists.
 */
export function normalizeAuthEmailForCompare(email: string | null | undefined): string {
  if (!email) return "";
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return e;
}

/** Strip leading @ and lowercase — for display handle / admin handle checks. */
export function normalizeForgeDisplayHandle(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.trim();
  if (s.startsWith("@")) s = s.slice(1).trim();
  return s.toLowerCase();
}

/** Sign-in identifier: strip one leading `@` so `@Handle` matches `Handle` (plain emails unchanged: `@` is not valid as first char of stored email). */
export function stripLeadingAtForLoginIdentifier(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("@")) return t;
  return t.slice(1).trim();
}

/** Reserved forge operator handles (case-insensitive). Default: lustforge — must pair with allowed email or user id. */
export function platformAdminHandleSet(): Set<string> {
  const raw = (import.meta.env.VITE_ADMIN_HANDLES as string | undefined)?.trim();
  const parts = raw
    ? raw.split(",").map((s) => normalizeForgeDisplayHandle(s)).filter(Boolean)
    : ["lustforge"];
  return new Set(parts);
}

/** All admin emails (normalized for Gmail dot rules). Comma-separated in `VITE_ADMIN_EMAIL`. */
export function platformAdminEmailList(): string[] {
  const raw = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim();
  if (!raw) return [normalizeAuthEmailForCompare("lustforgeapp@gmail.com")];
  return raw
    .split(",")
    .map((s) => normalizeAuthEmailForCompare(s.trim()))
    .filter(Boolean);
}

/** Primary admin email (first entry, normalized) — for display or legacy reads. */
export const PLATFORM_ADMIN_EMAIL =
  platformAdminEmailList()[0] ?? normalizeAuthEmailForCompare("lustforgeapp@gmail.com");

const PLATFORM_ADMIN_EMAIL_SET = new Set(platformAdminEmailList());

/** Optional UUIDs (comma-separated in `VITE_ADMIN_USER_IDS`) — admin even if email changes. */
export function platformAdminUserIds(): Set<string> {
  const raw = (import.meta.env.VITE_ADMIN_USER_IDS as string | undefined)?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

const PLATFORM_ADMIN_USER_ID_SET = platformAdminUserIds();

/** Shown in admin footer / copy; keeps env casing when set. */
export function platformAdminEmailDisplay(): string {
  const raw = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim();
  return raw || "lustforgeapp@gmail.com";
}

/**
 * Forge operator / admin UI gate.
 * - Matches by **normalized Gmail** on `VITE_ADMIN_EMAIL` list, **user id** list, or reserved **handle** (default `lustforge`)
 *   together with the same email or id (handles are globally unique in `profiles`).
 */
export function isPlatformAdmin(
  user: { id?: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
  opts?: { profileDisplayName?: string | null },
): boolean {
  if (!user) return false;
  if (user.id && PLATFORM_ADMIN_USER_ID_SET.has(user.id)) return true;

  const eNorm = normalizeAuthEmailForCompare(user.email);
  if (eNorm && PLATFORM_ADMIN_EMAIL_SET.has(eNorm)) return true;

  const handles = platformAdminHandleSet();
  const ph = normalizeForgeDisplayHandle(opts?.profileDisplayName ?? undefined);
  const meta = user.user_metadata ?? {};
  const u = typeof meta.username === "string" ? normalizeForgeDisplayHandle(meta.username) : "";
  const f = typeof meta.full_name === "string" ? normalizeForgeDisplayHandle(meta.full_name) : "";
  const handleHit =
    (ph !== "" && handles.has(ph)) || (u !== "" && handles.has(u)) || (f !== "" && handles.has(f));
  if (!handleHit) return false;

  return Boolean(
    (eNorm && PLATFORM_ADMIN_EMAIL_SET.has(eNorm)) ||
      (user.id && PLATFORM_ADMIN_USER_ID_SET.has(user.id)),
  );
}

/** When false (env `VITE_PUBLIC_SIGNUP` = false / 0 / off), the auth page hides Sign up. Also turn off signups in Supabase Dashboard → Authentication. */
export function isPublicSignUpEnabled(): boolean {
  const raw = (import.meta.env.VITE_PUBLIC_SIGNUP as string | undefined)?.trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

export const EMAIL_ADDRESSES = {
  auth: import.meta.env.VITE_AUTH_EMAIL_FROM ?? "donotreply@lustforge.app",
  welcome: import.meta.env.VITE_WELCOME_EMAIL ?? "hello@lustforge.app",
  notify: import.meta.env.VITE_NOTIFY_EMAIL ?? "notify@lustforge.app",
  support: import.meta.env.VITE_SUPPORT_EMAIL ?? "support@lustforge.app",
  admin: platformAdminEmailDisplay(),
};

export const AUTH_SENDER_NAME = "LustForge AI";
