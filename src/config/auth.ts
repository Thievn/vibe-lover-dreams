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
  let local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return e;
}

/** Founder mailbox — always merged into `VITE_ADMIN_EMAIL` so a single extra env address cannot lock the Gmail operator out. */
const DEFAULT_PLATFORM_ADMIN_EMAIL = normalizeAuthEmailForCompare("lustforgeapp@gmail.com");

/** Strip leading `@` and lowercase — for display handle / admin handle checks. */
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

/** All admin emails (normalized for Gmail dot/+ rules). Comma-separated in `VITE_ADMIN_EMAIL`, plus founder Gmail always. */
export function platformAdminEmailList(): string[] {
  const raw = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim();
  const fromEnv = raw
    ? raw
        .split(",")
        .map((s) => normalizeAuthEmailForCompare(s.trim()))
        .filter(Boolean)
    : [];
  return Array.from(new Set([...fromEnv, DEFAULT_PLATFORM_ADMIN_EMAIL]));
}

/** Primary admin email (first env entry if any, else founder) — for display or legacy reads. */
export const PLATFORM_ADMIN_EMAIL = platformAdminEmailList()[0] ?? DEFAULT_PLATFORM_ADMIN_EMAIL;

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

/**
 * Open signup: **any** email may use the Sign up form. Requires env explicitly set to true / 1 / on.
 * When unset or false, only `inviteOnlySignupEmailSet()` may register (beta).
 */
export function isPublicSignUpEnabled(): boolean {
  const raw = (import.meta.env.VITE_PUBLIC_SIGNUP as string | undefined)?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "on";
}

/** Beta / default: only these normalized addresses may self-serve password sign-up (unless public signup is on). */
const BETA_SIGNUP_EMAILS = [
  normalizeAuthEmailForCompare("lustforgeapp@gmail.com"),
  normalizeAuthEmailForCompare("thievnsden@gmail.com"),
].filter(Boolean);

const BETA_SIGNUP_EMAIL_SET = new Set(BETA_SIGNUP_EMAILS);

/**
 * Emails allowed to use Sign up when not in open-public mode. Merge of fixed beta inboxes plus
 * `VITE_INVITE_SIGNUP_EMAILS` (comma-separated, normalized).
 */
export function inviteOnlySignupEmailSet(): Set<string> {
  const out = new Set<string>(BETA_SIGNUP_EMAIL_SET);
  const raw = (import.meta.env.VITE_INVITE_SIGNUP_EMAILS as string | undefined)?.trim();
  if (raw) {
    for (const part of raw.split(",")) {
      const n = normalizeAuthEmailForCompare(part.trim());
      if (n) out.add(n);
    }
  }
  return out;
}

/** Show Sign up tab when open signup is on, or when the invite/beta list is non-empty. */
export function isSignUpOfferedInAuthUi(): boolean {
  return isPublicSignUpEnabled() || inviteOnlySignupEmailSet().size > 0;
}

/** That email may complete `signUp` when invite-only / beta mode applies. */
export function canInviteOnlySelfRegister(email: string | null | undefined): boolean {
  const n = normalizeAuthEmailForCompare(email);
  return Boolean(n && inviteOnlySignupEmailSet().has(n));
}

/** Whether this email may register with email+password on /auth. */
export function canEmailRegisterWithPassword(email: string | null | undefined): boolean {
  if (isPublicSignUpEnabled()) return true;
  return canInviteOnlySelfRegister(email);
}

export const EMAIL_ADDRESSES = {
  auth: import.meta.env.VITE_AUTH_EMAIL_FROM ?? "donotreply@lustforge.app",
  welcome: import.meta.env.VITE_WELCOME_EMAIL ?? "hello@lustforge.app",
  notify: import.meta.env.VITE_NOTIFY_EMAIL ?? "notify@lustforge.app",
  support: import.meta.env.VITE_SUPPORT_EMAIL ?? "support@lustforge.app",
  admin: platformAdminEmailDisplay(),
};

export const AUTH_SENDER_NAME = "LustForge AI";
