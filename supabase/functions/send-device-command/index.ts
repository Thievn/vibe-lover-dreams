import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Lovense Standard / Server API only documents four preset names (lowercase). */
const LOVENSE_PRESET_NAMES = new Set(["pulse", "wave", "fireworks", "earthquake"]);

const PRESET_ALIASES: Record<string, string> = {
  circle: "wave",
  chacha: "pulse",
  random: "earthquake",
};

function normalizeLovensePresetName(raw: string): string {
  const k = raw.trim().toLowerCase();
  if (LOVENSE_PRESET_NAMES.has(k)) return k;
  return PRESET_ALIASES[k] ?? "pulse";
}

function isCustomPatternPayload(body: Record<string, unknown>): boolean {
  if (body.patternSubtype === "custom") return true;
  const rule = typeof body.patternRule === "string" ? body.patternRule.trim() : "";
  const strength = typeof body.patternStrength === "string" ? body.patternStrength.trim() : "";
  if (body.patternSubtype === "preset") return false;
  return Boolean(rule && strength);
}

function validateLovensePatternRule(rule: string): string | null {
  if (!rule.includes("V:1") || !rule.endsWith("#")) {
    return "Invalid pattern rule (expected Lovense shape, e.g. V:1;F:v;S:500#)";
  }
  return null;
}

function validateStrengthSteps(strength: string): string | null {
  const parts = strength.split(";").filter((x) => x.length > 0);
  if (parts.length === 0) return "Empty strength pattern";
  if (parts.length > 50) return "Too many strength steps (max 50)";
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0 || n > 20) return "Strength values must be 0–20";
  }
  return null;
}

/** Server API returns `{ code: 200, result: true }` or `{ code: 400, message: "..." }` etc. */
function lovenseInvokeFailed(result: unknown): string | null {
  if (result == null) return "Empty response from Lovense";
  if (typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if (Object.keys(r).length === 0) return "Unexpected Lovense response";

  if (r.result === true) return null;
  if (r.code === 200 || r.code === "200") return null;
  if (typeof r.type === "string" && r.type.toLowerCase() === "ok") return null;

  if (r.result === false) {
    return typeof r.message === "string" && r.message.trim()
      ? r.message.trim()
      : "Lovense command failed";
  }

  if (typeof r.code === "number" && r.code >= 400) {
    return typeof r.message === "string" && r.message.trim()
      ? r.message.trim()
      : `Lovense error (${r.code})`;
  }

  if (typeof r.message === "string" && r.message.trim()) {
    if (r.code === 0 || r.code === "0") return null;
    if (r.code === 200 || r.code === "200") return null;
    return r.message.trim();
  }

  return null;
}

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
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as Record<string, unknown>;
    const command = body.command as string | undefined;
    const intensity = body.intensity as number | undefined;
    const duration = body.duration as number | undefined;
    const pattern = body.pattern as string | undefined;
    const patternRule = typeof body.patternRule === "string" ? body.patternRule.trim() : "";
    const patternStrength = typeof body.patternStrength === "string" ? body.patternStrength.trim() : "";
    /** Lovense LAN uid — required when user has multiple toys registered */
    const deviceUidFromBody =
      typeof body.deviceUid === "string"
        ? body.deviceUid.trim()
        : typeof body.device_uid === "string"
          ? body.device_uid.trim()
          : "";

    const { data: profile } = await supabase
      .from("profiles")
      .select("device_uid")
      .eq("user_id", user.id)
      .single();

    const legacyUid = profile?.device_uid?.trim() || "";

    const { data: toys } = await supabase
      .from("user_lovense_toys")
      .select("device_uid")
      .eq("user_id", user.id);

    const owned = new Set((toys ?? []).map((t: { device_uid: string }) => t.device_uid));

    const requestedUid = deviceUidFromBody || legacyUid;

    if (!requestedUid) {
      return new Response(JSON.stringify({ error: "No device connected. Connect your device in Settings." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inRegistry = owned.has(requestedUid);
    const legacyMatch = Boolean(legacyUid && requestedUid === legacyUid);
    if (!inRegistry && !legacyMatch) {
      return new Response(JSON.stringify({ error: "That device is not linked to your account." }), {
        status: 403,
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

    /**
     * Must match `uid` from getQrCode (lovense-qrcode): the app user id, not the toy id.
     * Target toy is passed via `toy` per Lovense Server API v2.
     */
    const lovenseUserUid = user.id;
    const targetToyId = requestedUid;

    if (command === "Stop" || command === "stop") {
      const lovenseResponse = await fetch("https://api.lovense.com/api/lan/v2/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: developerToken,
          uid: lovenseUserUid,
          toy: targetToyId,
          command: "Function",
          action: "Stop",
          timeSec: 0,
          apiVer: 1,
        }),
      });

      const result = await lovenseResponse.json().catch(() => ({}));
      const logical = lovenseInvokeFailed(result);
      if (!lovenseResponse.ok || logical) {
        return new Response(
          JSON.stringify({
            error: logical || `Lovense HTTP ${lovenseResponse.status}`,
            result,
          }),
          { status: lovenseResponse.ok ? 400 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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

    const scaledIntensity = Math.min(Math.max(0, Math.round((intensity / 100) * 20)), 20);
    const clampedDuration = Math.min(Math.max(1, Math.round((duration || 5000) / 1000)), 30);

    if (command === "pattern") {
      const custom = isCustomPatternPayload(body);
      if (!custom && !(typeof pattern === "string" && pattern.trim())) {
        return new Response(JSON.stringify({ error: "Missing preset pattern name or custom rule+strength" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (custom) {
        const rule = patternRule;
        const strength = patternStrength;
        const errRule = validateLovensePatternRule(rule);
        if (errRule) {
          return new Response(JSON.stringify({ error: errRule }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errStr = validateStrengthSteps(strength);
        if (errStr) {
          return new Response(JSON.stringify({ error: errStr }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const lovenseResponse = await fetch("https://api.lovense.com/api/lan/v2/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: developerToken,
            uid: lovenseUserUid,
            toy: targetToyId,
            command: "Pattern",
            rule,
            strength,
            timeSec: clampedDuration,
            apiVer: 2,
          }),
        });

        const result = await lovenseResponse.json().catch(() => ({}));
        const logical = lovenseInvokeFailed(result);
        if (!lovenseResponse.ok || logical) {
          return new Response(
            JSON.stringify({
              error: logical || `Lovense HTTP ${lovenseResponse.status}`,
              result,
            }),
            { status: lovenseResponse.ok ? 400 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const presetName = normalizeLovensePresetName(typeof pattern === "string" ? pattern : "");
      const lovenseResponse = await fetch("https://api.lovense.com/api/lan/v2/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: developerToken,
          uid: lovenseUserUid,
          toy: targetToyId,
          command: "Preset",
          name: presetName,
          timeSec: clampedDuration,
          apiVer: 1,
        }),
      });

      const result = await lovenseResponse.json().catch(() => ({}));
      const logical = lovenseInvokeFailed(result);
      if (!lovenseResponse.ok || logical) {
        return new Response(
          JSON.stringify({
            error: logical || `Lovense HTTP ${lovenseResponse.status}`,
            result,
          }),
          { status: lovenseResponse.ok ? 400 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const commandMap: Record<string, string> = {
      vibrate: "Vibrate",
      pulse: "Vibrate",
      rotate: "Rotate",
    };
    const mappedCommand = commandMap[command] || "Vibrate";
    const action = `${mappedCommand}:${scaledIntensity}`;

    const lovenseResponse = await fetch("https://api.lovense.com/api/lan/v2/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: developerToken,
        uid: lovenseUserUid,
        toy: targetToyId,
        command: "Function",
        action,
        timeSec: clampedDuration,
        apiVer: 1,
      }),
    });

    const result = await lovenseResponse.json().catch(() => ({}));
    const logical = lovenseInvokeFailed(result);
    if (!lovenseResponse.ok || logical) {
      return new Response(
        JSON.stringify({
          error: logical || `Lovense HTTP ${lovenseResponse.status}`,
          result,
        }),
        { status: lovenseResponse.ok ? 400 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Device command error:", err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
