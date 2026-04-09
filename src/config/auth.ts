export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://lustforge.app";
export const AUTH_EMAIL_FROM = import.meta.env.VITE_AUTH_EMAIL_FROM ?? "donotreply@lustforge.app";

export const EMAIL_ADDRESSES = {
  auth: import.meta.env.VITE_AUTH_EMAIL_FROM ?? "donotreply@lustforge.app",
  welcome: import.meta.env.VITE_WELCOME_EMAIL ?? "hello@lustforge.app",
  notify: import.meta.env.VITE_NOTIFY_EMAIL ?? "notify@lustforge.app",
  support: import.meta.env.VITE_SUPPORT_EMAIL ?? "support@lustforge.app",
  admin: import.meta.env.VITE_ADMIN_EMAIL ?? "admin@lustforge.app",
};

export const AUTH_SENDER_NAME = "LustForge AI";
