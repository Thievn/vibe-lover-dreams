import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Settings, Zap } from "lucide-react";

export default function Account() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user;
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || "");
      }
    });
  }, []);

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { username: displayName.trim() }
      });
      if (error) throw error;
      toast.success("Display name updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update name");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>

        <h1 className="font-gothic text-5xl font-bold gradient-vice-text mb-2">Account Settings</h1>
        <p className="text-muted-foreground mb-10">Manage your profile and preferences</p>

        <div className="bg-card border border-border rounded-3xl p-10 space-y-10">
          {/* Profile Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <User className="h-6 w-6" /> Profile
            </h2>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl font-bold text-white">
                {displayName.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-lg focus:outline-none focus:border-primary"
                  placeholder="Display Name"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={isLoading}
                  className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Name"}
                </button>
              </div>
            </div>
          </div>

          {/* Toy Integration Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Zap className="h-6 w-6 text-electric-teal" /> Lovense Toys
            </h2>
            <div className="bg-muted/50 border border-border rounded-2xl p-8 text-center">
              <p className="text-muted-foreground">Connect your Lovense toys here to enable real-time control from your companions.</p>
              <button className="mt-6 px-8 py-3 bg-electric-teal text-black font-bold rounded-2xl hover:scale-105 transition-all">
                Connect Toy
              </button>
            </div>
          </div>

          {/* General Settings */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Settings className="h-6 w-6" /> General
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-muted/50 border border-border rounded-2xl p-6">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Always on for this aesthetic</p>
                </div>
                <div className="text-primary">Enabled</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
