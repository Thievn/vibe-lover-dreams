import { supabase } from "@/integrations/supabase/client";
import { lovenseToyAvatarUrl } from "@/lib/lovenseToyAvatar";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";

/** Edge function JSON body sometimes carries logical errors with HTTP 200. */
function logicalErrorFromDeviceInvokeData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
  if (d.success === false && typeof d.message === "string") return d.message.trim();
  return null;
}

export interface LovenseToy {
  /** DB row id */
  rowId: string;
  /** Lovense device uid — pass to commands as toyId */
  id: string;
  name: string;
  type: string;
  status: "online" | "offline" | "busy";
  battery: number;
  capabilities: string[];
  enabled: boolean;
  /** Resolved display image (DB or generated avatar) */
  imageUrl: string;
}

export interface LovenseCommand {
  command: "vibrate" | "thrust" | "pulse" | "rotate" | "stop" | "pattern";
  intensity: number;
  duration?: number;
  pattern?: string;
  /** Lovense `device_uid` — which toy to target (required when multiple are linked). */
  toyId?: string;
}

export const connectToy = async (callbackData: Record<string, unknown>): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const toyData = {
      uid: callbackData.uid,
      name: callbackData.name || "Unknown Toy",
      type: callbackData.toyType || "Unknown",
      status: "online" as const,
      battery: callbackData.battery || 100,
      capabilities: parseCapabilities(String(callbackData.toyType || "")),
      connected_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").update({
      device_uid: toyData.uid,
    }).eq("user_id", user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to connect toy:", error);
    return false;
  }
};

export const sendCommand = async (userId: string, command: LovenseCommand): Promise<boolean> => {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("device_uid")
      .eq("user_id", userId)
      .single();

    const targetUid = command.toyId?.trim() || profile?.device_uid?.trim() || null;
    if (!targetUid) {
      throw new Error("No toy connected");
    }

    const { data: toyRow } = await supabase
      .from("user_lovense_toys")
      .select("capabilities")
      .eq("user_id", userId)
      .eq("device_uid", targetUid)
      .maybeSingle();

    const caps = toyRow?.capabilities ?? ["vibrate"];

    if (
      caps.length > 0 &&
      command.command !== "pattern" &&
      command.command !== "stop" &&
      !caps.includes(command.command)
    ) {
      throw new Error(`Toy does not support ${command.command} command`);
    }

    const { data, error } = await supabase.functions.invoke("send-device-command", {
      body: {
        command: command.command,
        intensity: Math.min(100, Math.max(0, command.intensity)),
        duration: command.duration ?? 5000,
        pattern: command.pattern,
        deviceUid: targetUid,
      },
    });

    if (error) {
      throw new Error(await messageFromFunctionsInvoke(error, data));
    }
    const logical = logicalErrorFromDeviceInvokeData(data);
    if (logical) throw new Error(logical);
    return true;
  } catch (error) {
    console.error("Failed to send command:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

/** Stop every linked toy (enabled first — still sends stop to each uid you pass in). */
export const stopAllUserToys = async (userId: string, toys: LovenseToy[]): Promise<boolean> => {
  const targets = toys.filter((t) => t.enabled).length > 0 ? toys.filter((t) => t.enabled) : toys;
  if (targets.length === 0) return false;
  let ok = true;
  for (const t of targets) {
    try {
      await sendCommand(userId, {
        command: "stop",
        intensity: 0,
        duration: 0,
        toyId: t.id,
      });
    } catch {
      ok = false;
    }
  }
  return ok;
};

export const getToys = async (userId: string): Promise<LovenseToy[]> => {
  try {
    const { data: rows, error } = await supabase
      .from("user_lovense_toys")
      .select("id, device_uid, display_name, toy_type, capabilities, enabled, battery, image_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getToys:", error);
      const { data: profile } = await supabase
        .from("profiles")
        .select("device_uid")
        .eq("user_id", userId)
        .single();
      if (!profile?.device_uid) return [];
      return [
        {
          rowId: `legacy-${profile.device_uid}`,
          id: profile.device_uid,
          name: "Connected device",
          type: "unknown",
          status: "online",
          battery: 100,
          capabilities: ["vibrate"],
          enabled: true,
          imageUrl: lovenseToyAvatarUrl(profile.device_uid),
        },
      ];
    }

    if (!rows?.length) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("device_uid")
        .eq("user_id", userId)
        .single();

      if (!profile?.device_uid) return [];

      return [
        {
          rowId: `legacy-${profile.device_uid}`,
          id: profile.device_uid,
          name: "Connected device",
          type: "unknown",
          status: "online",
          battery: 100,
          capabilities: ["vibrate"],
          enabled: true,
          imageUrl: lovenseToyAvatarUrl(profile.device_uid),
        },
      ];
    }

    return rows.map((row) => {
      const seed = `${row.device_uid}:${row.display_name}`;
      const imageUrl = row.image_url?.trim() || lovenseToyAvatarUrl(seed);
      return {
        rowId: row.id,
        id: row.device_uid,
        name: row.display_name,
        type: row.toy_type,
        status: "online" as const,
        battery: typeof row.battery === "number" && row.battery >= 0 ? row.battery : 100,
        capabilities: row.capabilities?.length ? row.capabilities : ["vibrate"],
        enabled: row.enabled,
        imageUrl,
      };
    });
  } catch (error) {
    console.error("Failed to get toys:", error);
    return [];
  }
};

export const setToyEnabled = async (
  userId: string,
  deviceUid: string,
  enabled: boolean,
): Promise<boolean> => {
  const { error } = await supabase
    .from("user_lovense_toys")
    .update({ enabled })
    .eq("user_id", userId)
    .eq("device_uid", deviceUid);

  if (error) {
    console.error("setToyEnabled:", error);
    return false;
  }
  return true;
};

export const testToy = async (userId: string, toyDeviceUid: string): Promise<boolean> => {
  const testCommand: LovenseCommand = {
    command: "vibrate",
    intensity: 35,
    duration: 2000,
    toyId: toyDeviceUid,
  };
  try {
    return await sendCommand(userId, testCommand);
  } catch {
    return false;
  }
};

const parseCapabilities = (toyType: string): string[] => {
  const capabilities: Record<string, string[]> = {
    vibrator: ["vibrate", "pulse"],
    stroker: ["vibrate", "thrust", "stroke"],
    coupler: ["vibrate", "thrust", "rotate"],
    smart_dildo: ["vibrate", "thrust", "rotate"],
    nipple_clamps: ["vibrate", "clamp"],
    prostate_massager: ["vibrate", "pulse", "rotate"],
    rabbit: ["vibrate", "thrust", "rotate"],
    egg: ["vibrate", "pulse"],
    plug: ["vibrate", "pulse"],
    default: ["vibrate"],
  };
  return capabilities[toyType?.toLowerCase()] || capabilities.default;
};

export const generatePairingQR = async (_userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("lovense-qrcode", {
      body: {},
    });

    if (error) {
      console.error("lovense-qrcode:", await messageFromFunctionsInvoke(error, data));
      return null;
    }

    const url =
      data && typeof data === "object" && "qrCodeUrl" in data
        ? (data as { qrCodeUrl?: string }).qrCodeUrl?.trim()
        : undefined;
    return url || null;
  } catch (error) {
    console.error("Failed to generate pairing QR:", error);
    return null;
  }
};

/** Remove one toy by Lovense uid, or all toys if deviceUid omitted. Syncs profiles.device_uid. */
export const disconnectToy = async (userId: string, deviceUid?: string): Promise<boolean> => {
  try {
    if (deviceUid) {
      const { error } = await supabase
        .from("user_lovense_toys")
        .delete()
        .eq("user_id", userId)
        .eq("device_uid", deviceUid);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("user_lovense_toys").delete().eq("user_id", userId);
      if (error) throw error;
    }

    const { data: rest } = await supabase
      .from("user_lovense_toys")
      .select("device_uid")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    const nextPrimary = rest?.[0]?.device_uid ?? null;

    await supabase.from("profiles").update({ device_uid: nextPrimary }).eq("user_id", userId);

    return true;
  } catch (error) {
    console.error("Failed to disconnect toy:", error);
    return false;
  }
};
