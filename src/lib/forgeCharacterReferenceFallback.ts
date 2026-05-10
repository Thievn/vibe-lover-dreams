/**
 * When Grok vision sync did not return `appearance_reference`, still persist a dense
 * physical lock so chat Imagine + `enrichImaginePromptUniversal` can anchor likeness.
 */
export function buildForgeCharacterReferenceFallback(args: {
  displayName: string;
  gender: string;
  bodyType: string;
  ethnicityLabel?: string;
  narrativeAppearance: string;
}): string {
  const na = args.narrativeAppearance.replace(/\s+/g, " ").trim();
  const eth = (args.ethnicityLabel ?? "").replace(/\s+/g, " ").trim();
  const head = `Physical likeness lock for ${args.displayName} (${args.gender}; body type ${args.bodyType}).${eth && eth !== "—" ? ` Ancestry / complexion: ${eth}.` : ""}`;
  const core =
    na.length >= 120
      ? na
      : `${na} Same adult-presenting individual across every render — preserve face shape, eyes, hair, skin tone, build, species or fantasy marks, and tattoos from this description and the roster portrait.`;
  return `${head} ${core}`.replace(/\s+/g, " ").trim().slice(0, 4000);
}
