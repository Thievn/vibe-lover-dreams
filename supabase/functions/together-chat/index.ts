/**
 * @deprecated Retired — the app uses `grok-chat` + xAI only. This function remains for old deploys
 * and returns 410. Do not set TOGETHER_API_KEY; use XAI_API_KEY / GROK_API_KEY.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  return json(
    {
      error:
        "together-chat is retired. Update the client to use `grok-chat` only. Set XAI_API_KEY or GROK_API_KEY on Edge Functions.",
    },
    410,
  );
});
