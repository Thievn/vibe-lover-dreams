/**
 * Optional forge add-on: anatomy/presentation line that combines with `gender` (any identity).
 * Stored in `custom_characters.identity_anatomy_detail`.
 */
export type IdentityAnatomyDetail = "" | "pre_op" | "post_op" | "futa";

export const IDENTITY_ANATOMY_CHOICES: { value: IdentityAnatomyDetail; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "pre_op", label: "Pre-op" },
  { value: "post_op", label: "Post-op" },
  { value: "futa", label: "Futa" },
];

export function normalizeIdentityAnatomyDetail(raw: string | null | undefined): IdentityAnatomyDetail {
  const t = String(raw ?? "").trim();
  if (t === "pre_op" || t === "post_op" || t === "futa") return t;
  return "";
}

/** Short label for tags / bios. */
export function labelIdentityAnatomyForTags(d: IdentityAnatomyDetail): string | null {
  if (d === "pre_op") return "pre-op";
  if (d === "post_op") return "post-op";
  if (d === "futa") return "futa";
  return null;
}

/** Complements `gender` in the companion system prompt (one clause). */
export function identityAnatomyForSystemOneLiner(d: IdentityAnatomyDetail): string {
  if (d === "pre_op") {
    return "Anatomy: pre-op presentation — keep consistent with their identity in every scene; nothing contradicts the portrait.";
  }
  if (d === "post_op") {
    return "Anatomy: post-op presentation — keep consistent with their identity in every scene; nothing contradicts the portrait.";
  }
  if (d === "futa") {
    return "Anatomy: futa (fantasy hermaphrodite) — adult fantasy; stay consistent; SFW portrait is suggestive, not explicit.";
  }
  return "";
}

/** I2V / art prompts — SFW-appropriate, locks consistency. */
export function identityAnatomyForPortraitPrompt(d: IdentityAnatomyDetail): string {
  if (d === "pre_op") {
    return "Optional identity lock (SFW art): pre-op anatomy presentation consistent with the chosen identity — use styling, silhouette, and character energy only, no explicit nudity.";
  }
  if (d === "post_op") {
    return "Optional identity lock (SFW art): post-op anatomy presentation consistent with the chosen identity — styling and silhouette, no explicit detail.";
  }
  if (d === "futa") {
    return "Optional identity lock (SFW art): futa / dual fantasy — tasteful, suggestive framing; no explicit genital detail in the still.";
  }
  return "";
}
