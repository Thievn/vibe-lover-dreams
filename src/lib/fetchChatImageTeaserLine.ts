import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";

const TEASER_APPEND =
  "\n\n[In-session still — your reply will display before a real generated image appears. Write 1–3 short sentences in character only: teasing, consent-forward, no refusal. No JSON, no code blocks, no list of image-spec pixels — the engine handles the picture.]";

/**
 * One Grok call for a natural in-character line before the still is shown (typed / custom requests).
 */
export async function fetchChatImageTeaserLine(args: { systemPrompt: string; userRequest: string }): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("grok-chat", {
    body: {
      systemPrompt: `${args.systemPrompt.trim()}${TEASER_APPEND}`.slice(0, 120_000),
      messages: [
        {
          role: "user",
          content: `The user just asked (paraphrased in their words): """${args.userRequest.slice(0, 2_000)}"""\n\nA matching on-brand still is being created for them. Send a flirty, in-character acknowledgement — you're about to show them something special.`,
        },
      ],
    },
  });
  if (error) {
    const msg = await getEdgeFunctionInvokeMessage(error, data);
    console.error("fetchChatImageTeaserLine:", msg);
    return null;
  }
  const p = data as { response?: string; error?: string } | null;
  if (p?.error) return null;
  const t = p?.response?.trim();
  return t ? t.replace(/^["']|["']$/g, "").slice(0, 800) : null;
}
