import { useState, useEffect } from "react";
import { OctagonX } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getToys, stopAllUserToys, type LovenseToy } from "@/lib/lovense";

const EmergencyStop = () => {
  const [connectedToys, setConnectedToys] = useState<LovenseToy[]>([]);
  const [stopping, setStopping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkToys = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setConnectedToys([]);
          setUserId(null);
          return;
        }

        setUserId(session.user.id);
        const toys = await getToys(session.user.id);
        setConnectedToys(toys);
      } catch (error) {
        console.error("Failed to check toys:", error);
        setConnectedToys([]);
      }
    };

    checkToys();

    // Re-check periodically
    const interval = setInterval(checkToys, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleStop = async () => {
    if (!userId) {
      toast.error("No authenticated user found.");
      return;
    }

    setStopping(true);
    try {
      await stopAllUserToys(userId, connectedToys);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Emergency stop error:", error);
      toast.error("Failed to stop devices — try again");
    } finally {
      setStopping(false);
    }
  };

  return (
    <AnimatePresence>
      {connectedToys.length > 0 && (
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
