import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Save, Trash2, Shield, Loader2, Wifi, WifiOff, QrCode } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [safeWord, setSafeWord] = useState(() => localStorage.getItem("lustforge-safeword") || "RED");
  const [intensityLimit, setIntensityLimit] = useState(() => parseInt(localStorage.getItem("lustforge-intensity") || "100"));
  const [deviceUid, setDeviceUid] = useState("");
  const [saving, setSaving] = useState(false);

  // QR connection state
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadDeviceUid(session.user.id);
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadDeviceUid = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("device_uid")
      .eq("user_id", userId)
      .single();
    if (data?.device_uid) setDeviceUid(data.device_uid);
  };

  const handleConnectToy = async () => {
    if (!user) return;
    setQrLoading(true);
    setQrCodeUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("lovense-qrcode", {
        body: {},
      });

      if (error) throw error;

      if (data?.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl);
        startPolling();
      } else {
        toast.error("Could not generate QR code");
      }
    } catch (err: any) {
      console.error("QR code error:", err);
      toast.error("Failed to generate connection QR code");
    } finally {
      setQrLoading(false);
    }
  };

  const startPolling = () => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes at 3s intervals

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        stopPolling();
        setQrCodeUrl(null);
        toast.error("Connection timed out. Try again.");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("device_uid")
        .eq("user_id", user.id)
        .single();

      if (data?.device_uid && data.device_uid !== deviceUid) {
        setDeviceUid(data.device_uid);
        stopPolling();
        setQrCodeUrl(null);
        toast.success("🎉 Device connected successfully!");
      }
    }, 3000);
  };

  const stopPolling = () => {
    setPolling(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ device_uid: null })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to disconnect device");
    } else {
      setDeviceUid("");
      toast.success("Device disconnected");
    }
  };

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem("lustforge-safeword", safeWord);
    localStorage.setItem("lustforge-intensity", intensityLimit.toString());
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved!");
    }, 300);
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm("Are you sure? This will delete ALL your chat history across all companions.")) return;

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to clear history");
    } else {
      toast.success("Chat history cleared");
    }
  };

  const handleResetAgeGate = () => {
    localStorage.removeItem("lustforge-age-verified");
    toast.success("Age gate reset. You'll be asked to verify again.");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-gothic text-3xl font-bold text-foreground mb-8">Settings</h1>

          {/* Safety */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Safety & Consent
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1">Safe Word</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Type this in any chat to immediately stop all activity and device control.
                </p>
                <input
                  type="text"
                  value={safeWord}
                  onChange={(e) => setSafeWord(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-destructive transition-colors"
                  placeholder="e.g., RED"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">
                  Device Intensity Limit: <span className="text-primary font-bold">{intensityLimit}%</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Maximum intensity AI companions can send to your device.
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensityLimit}
                  onChange={(e) => setIntensityLimit(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Off</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>Max</span>
                </div>
              </div>
            </div>
          </div>

          {/* Device Connection */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              {deviceUid ? (
                <Wifi className="h-5 w-5 text-accent" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              Device Connection
            </h2>

            {deviceUid ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm text-accent font-medium">Device connected</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-colors"
                >
                  <WifiOff className="h-4 w-4" />
                  Disconnect Device
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Scan the QR code with your Lovense Remote app to connect your device.
                </p>

                {qrCodeUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-xl">
                      <img
                        src={qrCodeUrl}
                        alt="Scan to connect device"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground animate-pulse">
                      Waiting for connection...
                    </p>
                    <button
                      onClick={() => {
                        stopPolling();
                        setQrCodeUrl(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectToy}
                    disabled={qrLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    {qrLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4" />
                    )}
                    Connect Device
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h2 className="font-gothic text-lg font-bold text-foreground mb-4">Privacy</h2>
            <div className="space-y-3">
              <button
                onClick={handleClearHistory}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Chat History
              </button>
              <button
                onClick={handleResetAgeGate}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
              >
                Reset Age Verification
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
