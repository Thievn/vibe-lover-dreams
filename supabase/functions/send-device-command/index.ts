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

    const { command, intensity, duration } = await req.json();

    if (!command || typeof intensity !== "number") {
      return new Response(JSON.stringify({ error: "Missing command or intensity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's device UID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("device_uid")
      .eq("user_id", user.id)
      .single();

    if (!profile?.device_uid) {
      return new Response(JSON.stringify({ error: "No device connected. Add your device UID in Settings." }), {
        status: 400,
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

    // Clamp intensity to user's configured limit
    const clampedIntensity = Math.min(Math.max(0, Math.round(intensity)), 20);
    const clampedDuration = Math.min(Math.max(1, duration || 5), 30);

    // Send command via Lovense Standard API
    const lovenseResponse = await fetch("https://api.lovense.com/api/lan/v2/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: developerToken,
        uid: profile.device_uid,
        command: "Function",
        action: `${command}:${clampedIntensity}`,
        timeSec: clampedDuration,
        apiVer: 1,
      }),
    });

    const result = await lovenseResponse.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Device command error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
