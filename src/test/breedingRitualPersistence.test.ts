import { describe, expect, it, vi } from "vitest";
import {
  saveBreedingRitualResult,
  type BreedingOffspringData,
  type BreedingRitualSupabaseClient,
} from "@/lib/breedingRitualPersistence";

const offspringData: BreedingOffspringData = {
  id: "offspring-1",
  name: "Test Offspring",
  type: "Hybrid",
  description: "A test offspring",
  rarity: "common",
  traits: "Curious",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createClient({
  user = { id: "user-1" },
  authError = null,
  relationshipError = null,
  giftError = null,
}: {
  user?: { id: string } | null;
  authError?: unknown;
  relationshipError?: unknown;
  giftError?: unknown;
} = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: relationshipError });
  const insert = vi.fn().mockResolvedValue({ error: giftError });
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: authError });
  const from = vi.fn((table: string) => {
    if (table === "companion_relationships") return { upsert };
    if (table === "companion_gifts") return { insert };
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    client: { auth: { getUser }, from } as BreedingRitualSupabaseClient,
    getUser,
    from,
    upsert,
    insert,
  };
}

describe("saveBreedingRitualResult", () => {
  it("saves relationship progress before inserting the offspring gift", async () => {
    const { client, upsert, insert } = createClient();

    await saveBreedingRitualResult({ companionId: "companion-1", offspringData, client });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        companion_id: "companion-1",
        breeding_progress: 100,
        affection_level: 75,
      }),
    );
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      companion_id: "companion-1",
      gift_type: "offspring",
      gift_data: offspringData,
    });
  });

  it("throws and skips the gift insert when relationship persistence fails", async () => {
    const { client, insert } = createClient({
      relationshipError: { message: "new row violates row-level security policy", code: "42501" },
    });

    await expect(saveBreedingRitualResult({ companionId: "companion-1", offspringData, client })).rejects.toThrow(
      "Could not update breeding progress: new row violates row-level security policy",
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it("throws when the offspring gift insert fails", async () => {
    const { client } = createClient({
      giftError: { message: "duplicate key value violates unique constraint", code: "23505" },
    });

    await expect(saveBreedingRitualResult({ companionId: "companion-1", offspringData, client })).rejects.toThrow(
      "Could not save offspring gift: duplicate key value violates unique constraint",
    );
  });

  it("requires a signed-in user before writing", async () => {
    const { client, upsert, insert } = createClient({ user: null });

    await expect(saveBreedingRitualResult({ companionId: "companion-1", offspringData, client })).rejects.toThrow(
      "You must be signed in to save breeding results.",
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
