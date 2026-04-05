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
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lovense sends callback data as JSON POST
    let callbackData: any;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      callbackData = await req.json();
    } else {
      // Could be form-encoded
      const text = await req.text();
      try {
        callbackData = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        callbackData = Object.fromEntries(params.entries());
      }
    }

    console.log("Lovense callback received:", JSON.stringify(callbackData));

    // Extract uid from callback - Lovense sends uid in the callback body
    const deviceUid = callbackData.uid || callbackData.deviceId || callbackData.utoken;
    
    // Get pairing token from query params or callback data
    const url = new URL(req.url);
    const pairingToken = url.searchParams.get("token") || callbackData.utoken;

    if (!pairingToken) {
      console.error("No pairing token in callback");
      return new Response(JSON.stringify({ error: "Missing pairing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up user from pairing token
    const { data: pairing, error: pairingError } = await serviceClient
      .from("lovense_pairings")
      .select("user_id, expires_at")
      .eq("pairing_token", pairingToken)
      .single();

    if (pairingError || !pairing) {
      console.error("Pairing not found:", pairingError);
      return new Response(JSON.stringify({ error: "Invalid or expired pairing" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (new Date(pairing.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Pairing token expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save device UID to user's profile
    const uidToStore = deviceUid || pairingToken;
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({ device_uid: uidToStore })
      .eq("user_id", pairing.user_id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save device" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up pairing record
    await serviceClient
      .from("lovense_pairings")
      .delete()
      .eq("pairing_token", pairingToken);

    console.log("Device connected for user:", pairing.user_id, "uid:", uidToStore);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
