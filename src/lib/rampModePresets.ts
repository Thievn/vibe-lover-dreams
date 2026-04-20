/** Live Voice — Ramp Mode style (drives toy algorithm + prompt label). */
export const RAMP_PRESET_IDS = [
  "gentle_tease",
  "brutal_edge",
  "random_chaos",
  "slow_ruin",
  "mercy",
] as const;

export type RampPresetId = (typeof RAMP_PRESET_IDS)[number];

export const RAMP_PRESET_LABELS: Record<RampPresetId, string> = {
  gentle_tease: "Gentle Tease Ramp",
  brutal_edge: "Brutal Edging Ramp",
  random_chaos: "Random Chaos Ramp",
  slow_ruin: "Slow Build to Ruin",
  mercy: "Mercy Mode",
};

export const RAMP_PRESET_SHORT: Record<RampPresetId, string> = {
  gentle_tease: "Soft waves · slow build",
  brutal_edge: "Hard cuts · cruel drops",
  random_chaos: "Unpredictable spikes",
  slow_ruin: "Long climb · denial",
  mercy: "Release allowed · finish",
};
