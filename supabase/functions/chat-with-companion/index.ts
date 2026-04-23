/**
 * @deprecated Text chat moved to `together-chat` (typed) and `grok-chat` (Live Voice). Grok/xAI is also used for TTS, STT, images, and voice client secrets.
 * This endpoint returns HTTP 410 so stale clients fail loudly instead of silently using Grok for RP.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      error:
        "chat-with-companion is retired. Update the app and deploy `together-chat`; set TOGETHER_API_KEY on Edge Functions.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
