/**
 * When the user shuffles a forge **theme tab**, body type is drawn from a tab-affinity pool
 * so silhouettes read different per tab instead of one global uniform distribution.
 */
import { FORGE_BODY_GROUPS, FORGE_BODY_TYPES, type ForgeBodyType } from "@/lib/forgeBodyTypes";
import type { ForgeThemeTabId } from "@/lib/forgeThemeTabs";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** `FORGE_BODY_GROUPS` ids — union of matching groups becomes the shuffle pool. */
const TAB_BODY_GROUP_AFFINITY: Record<ForgeThemeTabId, readonly string[]> = {
  anime_temptation: ["humanoid", "creative", "hyper", "stature"],
  monster_desire: ["anthro", "fantasy", "hybrid", "otherworldly"],
  gothic_seduction: ["humanoid", "fantasy", "stature", "hyper"],
  realistic_craving: ["humanoid", "stature", "mobility"],
  dark_fantasy: ["fantasy", "hybrid", "otherworldly", "humanoid"],
  furry_den: ["anthro", "humanoid", "fantasy"],
  pet_play_kennel: ["humanoid", "anthro", "fantasy"],
  insectoid_hive: ["hybrid", "otherworldly", "anthro"],
  celestial_lust: ["fantasy", "humanoid", "otherworldly", "stature"],
  alien_embrace: ["otherworldly", "fantasy", "hybrid", "humanoid"],
  demonic_ruin: ["fantasy", "otherworldly", "hybrid", "hyper"],
  aquatic_depths: ["hybrid", "fantasy", "otherworldly", "anthro"],
  mechanical_seduction: ["otherworldly", "humanoid", "fantasy", "hybrid"],
  plant_bloom: ["otherworldly", "fantasy", "humanoid", "hybrid"],
  horror_whore: ["humanoid", "otherworldly", "fantasy", "stature"],
  mythic_beast: ["anthro", "fantasy", "hybrid", "otherworldly"],
  hyper_degenerate: ["humanoid", "creative", "otherworldly", "hybrid", "anthro", "fantasy"],
  latex_rubber: ["humanoid", "hyper", "otherworldly", "fantasy"],
  eldritch_brood: ["otherworldly", "hybrid", "creative", "fantasy"],
  grotesque_goddess: ["otherworldly", "hyper", "hybrid", "fantasy"],
};

export function pickRandomBodyTypeForForgeTab(tab: ForgeThemeTabId): ForgeBodyType {
  const groupIds = TAB_BODY_GROUP_AFFINITY[tab];
  const pool: ForgeBodyType[] = [];
  for (const gid of groupIds) {
    const g = FORGE_BODY_GROUPS.find((x) => x.id === gid);
    if (g) pool.push(...g.types);
  }
  if (!pool.length) return pick([...FORGE_BODY_TYPES]);
  return pick(pool);
}
