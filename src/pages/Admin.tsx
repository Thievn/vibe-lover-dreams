import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Shield, Users, Sparkles, CheckCircle, XCircle, Loader2, Palette } from "lucide-react";
import CompanionManager from "@/components/admin/CompanionManager";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  tokens_balance: number;
  tier: string;
  created_at: string;
}

interface CustomCharacter {
  id: string;
  user_id: string;
  name: string;
  personality: string;
  is_public: boolean;
  approved: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [characters, setCharacters] = useState<CustomCharacter[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "characters">("users");

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    // Check admin role via RPC-like query
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast.error("Access denied. Admin only.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    await Promise.all([loadProfiles(), loadCharacters()]);
    setLoading(false);
  };

  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProfiles(data as Profile[]);
  };

  const loadCharacters = async () => {
    const { data } = await supabase
      .from("custom_characters")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCharacters(data as CustomCharacter[]);
  };

  const approveCharacter = async (id: string) => {
    const { error } = await supabase
      .from("custom_characters")
      .update({ approved: true })
      .eq("id", id);
    if (error) {
      toast.error("Failed to approve");
    } else {
      toast.success("Character approved");
      setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, approved: true } : c)));
    }
  };

  const rejectCharacter = async (id: string) => {
    const { error } = await supabase
      .from("custom_characters")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to remove");
    } else {
      toast.success("Character removed");
      setCharacters((prev) => prev.filter((c) => c.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const totalUsers = profiles.length;
  const paidUsers = profiles.filter((p) => p.tier !== "free").length;
  const pendingCharacters = characters.filter((c) => c.is_public && !c.approved).length;

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-gothic text-3xl font-bold gradient-vice-text mb-2 flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mb-8">Manage users, characters, and platform metrics.</p>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: totalUsers, icon: Users },
              { label: "Paid Users", value: paidUsers, icon: Users },
              { label: "Custom Characters", value: characters.length, icon: Sparkles },
              { label: "Pending Approval", value: pendingCharacters, icon: Shield },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-border bg-card p-4">
                <m.icon className="h-5 w-5 text-primary mb-2" />
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(["users", "characters"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "users" ? "Users" : "Characters"}
              </button>
            ))}
          </div>

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tier</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tokens</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3 text-foreground">
                          {p.display_name || p.user_id.slice(0, 8) + "..."}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            p.tier !== "free"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {p.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground">{p.tokens_balance.toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Characters Tab */}
          {activeTab === "characters" && (
            <div className="space-y-4">
              {characters.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No custom characters yet.</p>
              ) : (
                characters.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{c.name}</h3>
                        {c.is_public && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            c.approved
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {c.approved ? "Approved" : "Pending"}
                          </span>
                        )}
                        {!c.is_public && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.personality}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {c.is_public && !c.approved && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => approveCharacter(c.id)}
                          className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => rejectCharacter(c.id)}
                          className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
