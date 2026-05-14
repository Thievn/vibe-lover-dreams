import { supabase } from "@/integrations/supabase/client";

export type NexusBreedingScriptLineDto = {
  kind: "speech" | "narration";
  speaker: 0 | 1 | null;
  text: string;
};

/**
 * Server-side Grok 4.3 explicit alternating dialogue for Nexus merge / breeding covenant overlays.
 */
export async function invokeNexusBreedingDialogue(args: {
  parentAId: string;
  parentBId: string;
  targetLineCount?: number;
}): Promise<{ lines: NexusBreedingScriptLineDto[]; model?: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke("nexus-breeding-dialogue", {
    body: {
      parentAId: args.parentAId,
      parentBId: args.parentBId,
      targetLineCount: args.targetLineCount,
    },
  });
  if (error) {
    return { error: error.message || "Breeding script request failed" };
  }
  const d = data as { lines?: NexusBreedingScriptLineDto[]; error?: string; model?: string } | null;
  if (!d || typeof d !== "object") {
    return { error: "Invalid response from breeding script" };
  }
  if (d.error) {
    return { error: String(d.error) };
  }
  if (!Array.isArray(d.lines) || d.lines.length === 0) {
    return { error: "Empty script from server" };
  }
  return { lines: d.lines, model: d.model };
}
