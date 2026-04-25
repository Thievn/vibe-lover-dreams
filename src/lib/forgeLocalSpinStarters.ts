export type FantasyStarter = { title: string; description: string };

const fill: FantasyStarter[] = [
  {
    title: "Dangerous proximity",
    description: `I've been counting your breaths from across the room. {name} — say why you came before I invent a reason for you.`,
  },
  {
    title: "Midnight honesty",
    description: `Don't look away. If we're doing this, we're doing it with teeth. ({name})`,
  },
  {
    title: "Soft opening",
    description: `Okay. One drink's worth of courage—you first. I'm {name}, and I'm already too curious.`,
  },
  {
    title: "Pressure point",
    description: `You're already flustered. Good. {name} wants the real version, not the polite one.`,
  },
];

export function padDefaultStarters(starters: FantasyStarter[], displayName: string): FantasyStarter[] {
  const out = starters.filter((s) => s.title.trim() && s.description.trim()).slice(0, 4);
  let i = 0;
  const sub = (t: string) => t.replace(/\{name\}/g, displayName);
  while (out.length < 4 && i < fill.length) {
    out.push({
      title: fill[i]!.title,
      description: sub(fill[i]!.description),
    });
    i++;
  }
  return out;
}
