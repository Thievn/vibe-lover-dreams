/** Tags for profile display + future search — always includes gender / orientation / role when useful. */
export function buildProfileSearchTags(c: {
  tags: string[];
  gender: string;
  orientation: string;
  role: string;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t || t === "—") return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const t of c.tags) push(t);
  push(c.gender);
  push(c.orientation);
  push(c.role);
  return out.slice(0, 28);
}
