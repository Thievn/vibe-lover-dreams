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

    const { command, intensity, duration, pattern } = await req.json();

    // Get user's device UID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("device_uid")
      .eq("user_id", user.id)
      .single();

    if (!profile?.device_uid) {
      return new Response(JSON.stringify({ error: "No device connected. Connect your device in Settings." }), {
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

    // Handle stop command
    if (command === "Stop" || command === "stop") {
      const lovenseResponse = await fetch("https://api.lovense.com/api/lan/v2/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: developerToken,
          uid: profile.device_uid,
          command: "Function",
          action: "Stop",
          apiVer: 1,
        }),
      });

      const result = await lovenseResponse.json();
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!command || typeof intensity !== "number") {
      return new Response(JSON.stringify({ error: "Missing command or intensity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scale intensity from 0-100 to 0-20 (Lovense API range)
    const scaledIntensity = Math.min(Math.max(0, Math.round((intensity / 100) * 20)), 20);
    const clampedDuration = Math.min(Math.max(1, Math.round((duration || 5000) / 1000)), 30);

    // Handle pattern command
    let action: string;
    if (command === "pattern" && pattern) {
      action = `Preset:${pattern}`;
    } else {
      // Map commands: vibrate, pulse, rotate
      const commandMap: Record<string, string> = {
        vibrate: "Vibrate",
        pulse: "Vibrate",
        rotate: "Rotate",
      };
      const mappedCommand = commandMap[command] || "Vibrate";
      action = `${mappedCommand}:${scaledIntensity}`;
    }

    const lovenseResponse = await fetch("https://api.lovense.com/api/lan/v2/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: developerToken,
        uid: profile.device_uid,
        command: "Function",
        action,
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
