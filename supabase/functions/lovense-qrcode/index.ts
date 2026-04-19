import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const developerToken = Deno.env.get("LOVENSE_DEVELOPER_TOKEN");
    if (!developerToken) {
      return new Response(JSON.stringify({ error: "Device integration not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a unique pairing token
    const pairingToken = crypto.randomUUID();

    // Store pairing token linked to user
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: pairingInsertError } = await serviceClient.from("lovense_pairings").insert({
      user_id: user.id,
      pairing_token: pairingToken,
    });

    if (pairingInsertError) {
      console.error("lovense_pairings insert:", pairingInsertError);
      return new Response(JSON.stringify({ error: "Could not start pairing session", details: pairingInsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lovense developer dashboard must list your callback URL as:
    //   https://<project-ref>.supabase.co/functions/v1/lovense-callback
    // (Scan flow sends pairing data to that endpoint; `utoken` matches `pairing_token` rows above.)

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const displayName =
      typeof profileRow?.display_name === "string" && profileRow.display_name.trim()
        ? profileRow.display_name.trim()
        : "";
    const uname =
      displayName ||
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
      (typeof user.email === "string" && user.email.split("@")[0]) ||
      "User";

    // Request QR code — Standard LAN API expects `v` (not `apiVer`). See Lovense Standard API docs.
    const lovenseRes = await fetch("https://api.lovense.com/api/lan/getQrCode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: developerToken,
        uid: user.id,
        uname,
        utoken: pairingToken,
        v: 2,
      }),
    });

    const lovenseData = (await lovenseRes.json()) as Record<string, unknown>;

    /** Standard LAN API: `{ code: 0, result: true, data: { qr: "https://...jpg" } }`. Some variants put the image URL in `message`. */
    const code = lovenseData.code;
    const codeOk = code === 0 || code === "0";
    const dataObj = lovenseData.data && typeof lovenseData.data === "object" ? (lovenseData.data as Record<string, unknown>) : null;
    let qrCodeUrl: string | null = null;
    if (dataObj && typeof dataObj.qr === "string" && dataObj.qr.trim()) {
      qrCodeUrl = dataObj.qr.trim();
    }
    if (!qrCodeUrl && typeof lovenseData.message === "string") {
      const m = lovenseData.message.trim();
      if (/^https?:\/\//i.test(m)) qrCodeUrl = m;
    }

    const explicitFail = lovenseData.result === false || lovenseData.success === false;
    if (!codeOk || explicitFail || !qrCodeUrl) {
      console.error("Lovense QR error:", JSON.stringify(lovenseData));
      return new Response(JSON.stringify({
        error: "Failed to generate QR code",
        details: typeof lovenseData.message === "string" ? lovenseData.message : JSON.stringify(lovenseData).slice(0, 500),
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      qrCodeUrl,
      pairingToken,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("QR code generation error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
