import { supabase } from "@/integrations/supabase/client";

// Lovense API integration
export interface LovenseToy {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'busy';
  battery: number;
  capabilities: string[]; // ['vibrate', 'thrust', 'pulse', 'rotate', etc.]
  enabled: boolean; // Added for enable/disable toggle
}

export interface LovenseCommand {
  command: 'vibrate' | 'thrust' | 'pulse' | 'rotate' | 'stop';
  intensity: number; // 0-20
  duration?: number; // milliseconds, use 0 or -1 for persistent until stopped
  pattern?: string; // for advanced patterns
  toyId?: string; // Optional specific toy ID for multi-toy support
}

/**
 * Connect a toy using callback data from Lovense
 */
export const connectToy = async (callbackData: any): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Parse Lovense callback data
    const toyData = {
      uid: callbackData.uid,
      name: callbackData.name || 'Unknown Toy',
      type: callbackData.toyType || 'Unknown',
      status: 'online' as const,
      battery: callbackData.battery || 100,
      capabilities: parseCapabilities(callbackData.toyType),
      connected_at: new Date().toISOString(),
    };

    // Update user profile with toy information
    const { error } = await supabase
      .from('profiles')
      .update({
        device_uid: toyData.uid,
        device_name: toyData.name,
        device_type: toyData.type,
        device_capabilities: toyData.capabilities,
        device_connected: true,
        device_last_seen: toyData.connected_at,
      })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to connect toy:', error);
    return false;
  }
};

/**
 * Send command to user's connected toy
 */
export const sendCommand = async (userId: string, command: LovenseCommand): Promise<boolean> => {
  try {
    // Get user's toy information
    const { data: profile } = await supabase
      .from('profiles')
      .select('device_uid, device_type, device_capabilities')
      .eq('user_id', userId)
      .single();

    if (!profile?.device_uid) {
      throw new Error('No toy connected');
    }

    // Validate command against toy capabilities
    if (profile.device_capabilities && !profile.device_capabilities.includes(command.command)) {
      throw new Error(`Toy does not support ${command.command} command`);
    }

    // Send command via Supabase edge function
    const { error } = await supabase.functions.invoke('send-device-command', {
      body: {
        command: command.command,
        intensity: Math.min(20, Math.max(0, command.intensity)),
        duration: command.duration || 5000,
        pattern: command.pattern,
        persistent: command.duration === 0 || command.duration === -1, // Flag for persistent command
      },
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to send command:', error);
    return false;
  }
};

/**
 * Get user's connected toys
 */
export const getToys = async (userId: string): Promise<LovenseToy[]> => {
  try {
    // Get user's connected toys and their status
    const { data: profile } = await supabase
      .from('profiles')
      .select('device_uid, device_name, device_type, device_capabilities, device_connected, device_last_seen')
      .eq('user_id', userId)
      .single();

    if (!profile?.device_uid) return [];

    const toy: LovenseToy = {
      id: profile.device_uid,
      name: profile.device_name || 'Unknown Toy',
      type: profile.device_type || 'Unknown',
      status: profile.device_connected ? 'online' : 'offline',
      battery: 100, // Would need to be updated from API
      capabilities: profile.device_capabilities || ['vibrate'],
      enabled: true, // Default to enabled for now, can be toggled in UI
    };
    return [toy];
  } catch (error) {
    console.error('Failed to get toys:', error);
    return [];
  }
};

/**
 * Test toy with short vibration
 */
export const testToy = async (userId: string, toyId: string): Promise<boolean> => {
  try {
    // Send a short vibration test
    const testCommand: LovenseCommand = {
      command: 'vibrate',
      intensity: 5,
      duration: 2000,
    };

    return await sendCommand(userId, testCommand);
  } catch (error) {
    console.error('Toy test failed:', error);
    return false;
  }
};

/**
 * Parse toy capabilities
 */
const parseCapabilities = (toyType: string): string[] => {
  const capabilities: Record<string, string[]> = {
    'vibrator': ['vibrate', 'pulse'],
    'stroker': ['vibrate', 'thrust', 'stroke'],
    'coupler': ['vibrate', 'thrust', 'rotate'],
    'smart_dildo': ['vibrate', 'thrust', 'rotate'],
    'nipple_clamps': ['vibrate', 'clamp'],
    'prostate_massager': ['vibrate', 'pulse', 'rotate'],
    'rabbit': ['vibrate', 'thrust', 'rotate'],
    'egg': ['vibrate', 'pulse'],
    'plug': ['vibrate', 'pulse'],
    'default': ['vibrate'],
  };
  return capabilities[toyType?.toLowerCase()] || capabilities.default;
};

/**
 * Generate QR code for toy pairing
 */
export const generatePairingQR = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('lovense-qrcode', {
      body: { userId },
    });

    if (error) throw error;

    return data.qrCodeUrl;
  } catch (error) {
    console.error('Failed to generate pairing QR:', error);
    return null;
  }
};

/**
 * Disconnect toy
 */
export const disconnectToy = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        device_uid: null,
        device_name: null,
        device_type: null,
        device_capabilities: null,
        device_connected: false,
        device_last_seen: null,
      })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to disconnect toy:', error);
    return false;
  }
};
