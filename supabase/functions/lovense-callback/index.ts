import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Lovense may send `toyList` (array) or `toys` (id → object map).
 * Map keys are often the device id; inner objects may omit `id` (see Standard API docs).
 */
function normalizeToyList(callbackData: Record<string, unknown>): Array<Record<string, unknown>> {
  const toyList = callbackData.toyList;
  if (Array.isArray(toyList)) return toyList as Array<Record<string, unknown>>;
  const toys = callbackData.toys;
  if (toys && typeof toys === "object" && !Array.isArray(toys)) {
    return Object.entries(toys as Record<string, Record<string, unknown>>).map(([mapKey, toy]) => {
      const rawId = toy.id ?? toy.uid ?? mapKey;
      const id = rawId != null ? String(rawId).trim() : "";
      return { ...toy, id: id || mapKey };
    });
  }
  return [];
}

function toyTypeFromRecord(toy: Record<string, unknown>): string {
  if (typeof toy.toyType === "string" && toy.toyType.trim()) return toy.toyType.toLowerCase();
  if (typeof toy.type === "string" && toy.type.trim()) return toy.type.toLowerCase();
  // Standard LAN callback uses `name` for model id (e.g. "max", "lush")
  if (typeof toy.name === "string" && toy.name.trim()) return String(toy.name).toLowerCase();
  return "unknown";
}

function capabilitiesForToyType(toyType: string): string[] {
  const t = (toyType || "").toLowerCase();
  const map: Record<string, string[]> = {
    lush: ["vibrate"],
    hush: ["vibrate"],
    nora: ["vibrate", "rotate"],
    max: ["vibrate", "thrust"],
    calor: ["vibrate"],
    gush: ["vibrate"],
    ferri: ["vibrate"],
    domi: ["vibrate"],
    osci: ["vibrate"],
    edge: ["vibrate"],
    solace: ["vibrate", "thrust"],
    default: ["vibrate"],
  };
  return map[t] || map.default;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let callbackData: Record<string, unknown>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      callbackData = (await req.json()) as Record<string, unknown>;
    } else {
      const text = await req.text();
      try {
        callbackData = JSON.parse(text) as Record<string, unknown>;
      } catch {
        const params = new URLSearchParams(text);
        callbackData = Object.fromEntries(params.entries()) as Record<string, unknown>;
      }
    }

    console.log("Lovense callback received:", JSON.stringify(callbackData));

    const url = new URL(req.url);
    const pairingToken =
      url.searchParams.get("token") ||
      (typeof callbackData.utoken === "string" ? callbackData.utoken : null) ||
      (typeof callbackData.token === "string" ? callbackData.token : null);

    if (!pairingToken) {
      console.error("No pairing token in callback");
      return new Response(JSON.stringify({ error: "Missing pairing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (new Date(pairing.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Pairing token expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toys = normalizeToyList(callbackData);

    const legacyUid =
      (typeof callbackData.uid === "string" && callbackData.uid) ||
      (typeof callbackData.deviceId === "string" && callbackData.deviceId) ||
      null;

    let firstDeviceUid: string | null = null;

    if (toys.length > 0) {
      for (const toy of toys) {
        const rawId = toy.id ?? toy.uid;
        const deviceUid = rawId != null ? String(rawId).trim() : "";
        if (!deviceUid) continue;

        if (!firstDeviceUid) firstDeviceUid = deviceUid;

        const name =
          (typeof toy.nickName === "string" && toy.nickName.trim()) ||
          (typeof toy.nickname === "string" && toy.nickname.trim()) ||
          (typeof toy.name === "string" && toy.name.trim()) ||
          "Lovense toy";
        const toyType = toyTypeFromRecord(toy);
        const nickname =
          typeof toy.nickName === "string"
            ? toy.nickName
            : typeof toy.nickname === "string"
              ? toy.nickname
              : null;
        const battery =
          typeof toy.battery === "number" && Number.isFinite(toy.battery) ? Math.round(toy.battery) : null;

        const { error: upsertErr } = await serviceClient.from("user_lovense_toys").upsert(
          {
            user_id: pairing.user_id,
            device_uid: deviceUid,
            display_name: name,
            toy_type: toyType,
            nickname,
            capabilities: capabilitiesForToyType(toyType),
            battery,
            enabled: true,
          },
          { onConflict: "user_id,device_uid" },
        );

        if (upsertErr) {
          console.error("user_lovense_toys upsert error:", upsertErr);
          return new Response(JSON.stringify({ error: "Failed to save device" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else if (legacyUid) {
      firstDeviceUid = legacyUid.trim();
      const { error: upsertErr } = await serviceClient.from("user_lovense_toys").upsert(
        {
          user_id: pairing.user_id,
          device_uid: firstDeviceUid,
          display_name: "Connected device",
          toy_type: "unknown",
          capabilities: capabilitiesForToyType("unknown"),
          enabled: true,
        },
        { onConflict: "user_id,device_uid" },
      );

      if (upsertErr) {
        console.error("user_lovense_toys legacy upsert error:", upsertErr);
        return new Response(JSON.stringify({ error: "Failed to save device" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "No toy data in callback" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await serviceClient
      .from("profiles")
      .update({ device_uid: firstDeviceUid })
      .eq("user_id", pairing.user_id);

    await serviceClient.from("lovense_pairings").delete().eq("pairing_token", pairingToken);

    console.log("Device(s) connected for user:", pairing.user_id, "primary uid:", firstDeviceUid);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Callback error:", err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
