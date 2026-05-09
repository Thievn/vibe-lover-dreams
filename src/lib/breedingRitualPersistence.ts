import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/supabaseError";

export interface BreedingOffspringData {
  id: string;
  name: string;
  type: string;
  description: string;
  rarity: string;
  traits: string;
  createdAt: Date;
}

interface SupabaseWriteResult {
  error: unknown;
}

export interface BreedingRitualSupabaseClient {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error?: unknown }>;
  };
  from: (table: string) => {
    upsert: (values: Record<string, unknown>) => Promise<SupabaseWriteResult>;
    insert: (values: Record<string, unknown>) => Promise<SupabaseWriteResult>;
  };
}

const defaultBreedingClient = supabase as unknown as BreedingRitualSupabaseClient;

function throwIfSupabaseError(error: unknown, action: string) {
  if (error) {
    throw new Error(`${action}: ${formatSupabaseError(error)}`);
  }
}

export async function saveBreedingRitualResult({
  companionId,
  offspringData,
  client = defaultBreedingClient,
}: {
  companionId: string;
  offspringData: BreedingOffspringData;
  client?: BreedingRitualSupabaseClient;
}) {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  throwIfSupabaseError(userError, "Could not verify user");

  if (!user) {
    throw new Error("You must be signed in to save breeding results.");
  }

  const relationshipResult = await client.from("companion_relationships").upsert({
    user_id: user.id,
    companion_id: companionId,
    breeding_progress: 100,
    affection_level: 75,
    last_interaction: new Date(),
  });

  throwIfSupabaseError(relationshipResult?.error, "Could not update breeding progress");

  const giftResult = await client.from("companion_gifts").insert({
    user_id: user.id,
    companion_id: companionId,
    gift_type: "offspring",
    gift_data: offspringData,
  });

  throwIfSupabaseError(giftResult?.error, "Could not save offspring gift");
}
