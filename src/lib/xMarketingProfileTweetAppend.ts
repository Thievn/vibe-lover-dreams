import { getPublicCompanionProfileShareUrl } from "@/lib/publicCompanionShareUrl";

export const X_PROFILE_CTA_PRESETS = ["check_out", "meet", "tap", "custom"] as const;
export type XProfileCtaPreset = (typeof X_PROFILE_CTA_PRESETS)[number];

function isPreset(v: string): v is XProfileCtaPreset {
  return (X_PROFILE_CTA_PRESETS as readonly string[]).includes(v);
}

function substituteCta(template: string, name: string, tagline: string): string {
  return template.replace(/\{name\}/gi, name).replace(/\{tagline\}/gi, tagline);
}

function lineForPreset(preset: XProfileCtaPreset, name: string, tagline: string, custom: string | null | undefined): string {
  switch (preset) {
    case "check_out":
      return `Check out ${name}'s profile:`;
    case "meet":
      return `Meet ${name} on LustForge —`;
    case "tap":
      return `Tap in for ${name}'s card:`;
    case "custom": {
      const t = (custom ?? "").trim();
      if (!t) return `Check out ${name}'s profile:`;
      return substituteCta(t, name, tagline);
    }
    default:
      return `Check out ${name}'s profile:`;
  }
}

export type AppendXProfileLinkArgs = {
  append: boolean;
  preset: string;
  custom?: string | null;
  companionId: string | null | undefined;
  companionName: string;
  companionTagline?: string | null;
};

/**
 * Appends a themed one-liner + canonical profile URL to the tweet body when marketing settings request it.
 */
export function appendXProfileLinkToTweet(baseTweet: string, args: AppendXProfileLinkArgs): string {
  const t = baseTweet.trimEnd();
  if (!args.append || !args.companionId?.trim()) return t;
  const presetRaw = (args.preset || "check_out").trim().toLowerCase();
  const preset: XProfileCtaPreset = isPreset(presetRaw) ? presetRaw : "check_out";
  const name = (args.companionName || "This companion").trim() || "This companion";
  const tagline = (args.companionTagline ?? "").trim();
  const line = lineForPreset(preset, name, tagline, args.custom);
  const url = getPublicCompanionProfileShareUrl(args.companionId.trim());
  // One block reads more intentional on X than an isolated URL line; platform still linkifies the URL.
  return `${t}\n\n${line}\n➜ ${url}`;
}
