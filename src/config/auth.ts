export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://lustforge.app";
export const AUTH_EMAIL_FROM = import.meta.env.VITE_AUTH_EMAIL_FROM ?? "donotreply@lustforge.app";

/** All admin emails (lowercase). Set `VITE_ADMIN_EMAIL` to one or more comma-separated addresses if multiple admins. */
export function platformAdminEmailList(): string[] {
  const raw = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim();
  if (!raw) return ["lustforgeapp@gmail.com"];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Primary admin email (first entry from env list) — for display or legacy reads. */
export const PLATFORM_ADMIN_EMAIL = platformAdminEmailList()[0] ?? "lustforgeapp@gmail.com";

const PLATFORM_ADMIN_EMAIL_SET = new Set(platformAdminEmailList());

/** Shown in admin footer / copy; keeps env casing when set. */
export function platformAdminEmailDisplay(): string {
  const raw = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim();
  return raw || "lustforgeapp@gmail.com";
}

export function isPlatformAdmin(user: { email?: string | null } | null | undefined): boolean {
  const e = user?.email?.trim().toLowerCase();
  return Boolean(e && PLATFORM_ADMIN_EMAIL_SET.has(e));
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
