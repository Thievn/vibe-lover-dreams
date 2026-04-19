import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";

export type ZernioHubTab = "compose" | "integrations" | "queue";

export async function invokeZernioSocial(body: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke("zernio-social", { body });
  if (error) {
    return { data: null, error: new Error(await getEdgeFunctionInvokeMessage(error, data)) };
  }
  const payload = data as { error?: string } | null;
  if (payload && typeof payload.error === "string" && payload.error) {
    return { data, error: new Error(payload.error) };
  }
  return { data, error: null };
}
