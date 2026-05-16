/**
 * Profile loop **user motion notes** — same philosophy as Moments / chat stills:
 * soften graphic phrasing; block crude intent with **whole-word / phrase** regex (no "cocktail", "accumulate", "hardcore rock").
 */

/** Same softening as `momentsPromptSanitize.ts` for user-supplied motion text before xAI. */
export function sanitizeProfileLoopUserMotionNotes(input: string): string {
  let s = input;
  s = s.replace(/\bartistic\s+nude\b/gi, "artistic sensual editorial");
  s = s.replace(/\bfull(?:y)?\s+nude\b/gi, "fully styled sensual editorial");
  s = s.replace(/\bpartial\s+nude\b/gi, "partially sheer editorial");
  s = s.replace(/\bsensual\s+nude\b/gi, "tasteful sensual editorial");
  s = s.replace(/\bimplied\s+nude\b/gi, "implied sheer coverage");
  s = s.replace(/\b(nudity|nudes)\b/gi, "sensual editorial coverage");
  s = s.replace(/\bnude\b/gi, "sensual editorial");
  s = s.replace(/\bnaked\b/gi, "wardrobe-forward clothed or sheer");
  return s;
}

/** Always reject (checked on raw user text). */
const HARD_REJECT_RAW: readonly RegExp[] = [
  /\bchild\s*porn\b/i,
  /\bkiddie\s*porn\b/i,
  /\b(underage|minor|loli|lolita|shota|shotacon)\b[\s\S]{0,48}\b(sex|porn|nude|naked|explicit)\b/i,
];

/**
 * Remaining crude / provider-risky phrasing after softening — whole-word style (avoids false positives).
 */
const POST_SANITIZE_BLOCKED: readonly RegExp[] = [
  /\bporn(?:ography)?\b/i,
  /\bxxx\b/i,
  /\bahegao\b/i,
  /\bbukkake\b/i,
  /\bcream(?:\s|-)?pie\b/i,
  /\bcum(?:shot|slut)?s?\b/i,
  /\bgang\s*bang\b/i,
  /\bblow\s*jobs?\b/i,
  /\bhand\s*jobs?\b/i,
  /\bpenis(?:es)?\b/i,
  /\bvaginas?\b/i,
  /\bclit(?:oris)?\b/i,
  /\bpussy\b/i,
  /\bdicks?\b/i,
  /\bcock\b/i,
  /\basshole\b/i,
  /\bjack\s*off\b/i,
  /\bjerk\s*off\b/i,
  /\bfuck(?:s|ed|ing)?\b/i,
  /\brape\b/i,
  /\braping\b/i,
  /\bmolest(?:s|ed|ing)?\b/i,
  /\bnsfw\b/i,
  /\bspread\s*(?:eagle|open)\b/i,
  /\ball\s*fours\b/i,
  /\bpenetration\b/i,
  /\bhardcore\b(?=\s*(?:porn|sex|xxx|adult|nsfw))/i,
  /\bexplicit\b(?=\s*(?:porn|sex|nudity|naked|acts?|penetration))/i,
];

export function profilePageLoopMotionNotesViolatePolicy(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  for (const re of HARD_REJECT_RAW) {
    if (re.test(t)) {
      return "Those instructions aren't allowed. Keep motion notes tasteful and suggestive only.";
    }
  }
  const sanitized = sanitizeProfileLoopUserMotionNotes(t);
  for (const re of POST_SANITIZE_BLOCKED) {
    if (re.test(sanitized)) {
      return "Instructions can't include disallowed wording. Keep it suggestive and SFW — no graphic sex or nudity requests.";
    }
  }
  return null;
}
