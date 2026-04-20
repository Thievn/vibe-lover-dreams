import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseCustomCharacterRow, type DbCompanion } from "@/hooks/useCompanions";

/**
 * `useCompanions()` omits forge rows with `exclude_from_personal_vault` and non–public-approved rows.
 * For `cc-…` routes, fetch the row directly when RLS allows (owner / DB admin).
 */
export function useForgeCompanionOverlay(
  id: string | undefined,
  dbCompanions: DbCompanion[] | undefined,
  companionsLoading: boolean,
): { dbComp: DbCompanion | null; forgeLookupBusy: boolean } {
  const [forgeRowOverlay, setForgeRowOverlay] = useState<DbCompanion | null>(null);
  const [forgeRowFetching, setForgeRowFetching] = useState(false);

  const dbCompFromList = useMemo(
    () => (id && dbCompanions ? dbCompanions.find((c) => c.id === id) : undefined) ?? null,
    [dbCompanions, id],
  );

  useEffect(() => {
    setForgeRowOverlay(null);
  }, [id]);

  useEffect(() => {
    if (!id?.startsWith("cc-")) {
      setForgeRowFetching(false);
      return;
    }
    if (dbCompFromList) {
      setForgeRowOverlay(null);
      setForgeRowFetching(false);
      return;
    }
    if (companionsLoading) return;

    let cancelled = false;
    setForgeRowFetching(true);
    const uuid = id.slice(3);
    void (async () => {
      const { data, error } = await supabase.from("custom_characters").select("*").eq("id", uuid).maybeSingle();
      if (cancelled) return;
      if (error || !data) setForgeRowOverlay(null);
      else setForgeRowOverlay(mapSupabaseCustomCharacterRow(data as Record<string, unknown>));
      setForgeRowFetching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, companionsLoading, dbCompFromList]);

  const dbComp = dbCompFromList ?? forgeRowOverlay;
  return { dbComp, forgeLookupBusy: forgeRowFetching };
}
