import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OctagonX } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const EmergencyStop = () => {
  const [hasDevice, setHasDevice] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    const checkDevice = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("device_uid")
        .eq("user_id", session.user.id)
        .single();

      setHasDevice(!!data?.device_uid);
    };

    checkDevice();

    // Re-check when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkDevice();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStop = async () => {
    setStopping(true);
    try {
      const { error } = await supabase.functions.invoke("send-device-command", {
        body: { command: "Stop", intensity: 0, duration: 0 },
      });

      if (error) throw error;
      toast.success("🛑 All devices stopped");
    } catch (err: any) {
      console.error("Emergency stop error:", err);
      toast.error("Failed to stop device — try again");
    } finally {
      setStopping(false);
    }
  };

  return (
    <AnimatePresence>
      {hasDevice && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={handleStop}
          disabled={stopping}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform disabled:opacity-50"
          title="Emergency Stop — Stop all devices"
        >
          <OctagonX className={`h-7 w-7 ${stopping ? "animate-pulse" : ""}`} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default EmergencyStop;
