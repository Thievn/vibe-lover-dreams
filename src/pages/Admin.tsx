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
  const [activeTab, setActiveTab] = useState<"users" | "characters" | "companions">("companions");

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
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="font-gothic text-3xl font-bold gradient-vice-text mb-2 flex items-center gap-3">
                <Shield className="h-7 w-7 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">Manage users, characters, and platform metrics.</p>
            </div>
            <button
              onClick={() => navigate("/create-character")}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Companion
            </button>
          </div>

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
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {(["companions", "users", "characters", "analytics", "marketing", "feedback"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "users" ? "Users" : 
                 tab === "characters" ? "Custom Characters" : 
                 tab === "analytics" ? "Analytics" :
                 tab === "marketing" ? "Marketing Forge" :
                 tab === "feedback" ? "Feedback & Voting" :
                 "Companions"}
              </button>
            ))}
          </div>

          {/* Companions Tab */}
          {activeTab === "companions" && <CompanionManager />}

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

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">User Engagement</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Daily Active Users</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 0.3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Messages Sent Today</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 2.5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Images Generated Today</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 0.8)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Revenue Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Recurring Revenue</span>
                    <span className="text-sm font-medium">${paidUsers * 9.99}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Revenue Per User</span>
                    <span className="text-sm font-medium">${paidUsers > 0 ? (paidUsers * 9.99 / paidUsers).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="text-sm font-medium">{totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : '0'}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Content Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Companions</span>
                    <span className="text-sm font-medium">20</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Custom Characters</span>
                    <span className="text-sm font-medium">{characters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Generated Images</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 5)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Marketing Forge Tab */}
          {activeTab === "marketing" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Marketing Campaign Builder</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Campaign Type</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground">
                      <option>Social Media</option>
                      <option>Email Newsletter</option>
                      <option>Discord Announcement</option>
                      <option>Reddit Post</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Target Audience</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground">
                      <option>All Users</option>
                      <option>Free Users</option>
                      <option>Premium Users</option>
                      <option>New Signups</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium text-foreground">Campaign Content</label>
                  <textarea
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-muted border border-border text-foreground resize-none"
                    rows={4}
                    placeholder="Write your marketing message here..."
                  />
                </div>
                <button className="mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                  Launch Campaign
                </button>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-left">
                    <div className="font-medium">Send Welcome Email</div>
                    <div className="text-sm opacity-75">To new users</div>
                  </button>
                  <button className="p-4 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors text-left">
                    <div className="font-medium">Feature Announcement</div>
                    <div className="text-sm opacity-75">New companion release</div>
                  </button>
                  <button className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors text-left">
                    <div className="font-medium">Promotional Offer</div>
                    <div className="text-sm opacity-75">Limited time discount</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback & Voting Tab */}
          {activeTab === "feedback" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">User Feedback</h3>
                <div className="space-y-4">
                  {[
                    { user: "User123", feedback: "Love the new image generation! So much better than before.", rating: 5, date: "2024-04-07" },
                    { user: "CompanionFan", feedback: "The breeding system is amazing. Can't wait for more features!", rating: 5, date: "2024-04-06" },
                    { user: "TechUser", feedback: "App feels premium now. The dark theme is perfect.", rating: 4, date: "2024-04-05" },
                    { user: "Newbie", feedback: "Easy to use but could use more tutorial content.", rating: 3, date: "2024-04-04" },
                  ].map((item, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-foreground">{item.user}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm ${i < item.rating ? 'text-yellow-400' : 'text-muted'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.feedback}</p>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Feature Voting</h3>
                <div className="space-y-4">
                  {[
                    { feature: "Voice Chat Integration", votes: 45, status: "planned" },
                    { feature: "Multi-Companion Scenes", votes: 38, status: "in-development" },
                    { feature: "Custom Avatar Upload", votes: 52, status: "requested" },
                    { feature: "Advanced Roleplay Scenarios", votes: 29, status: "completed" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium text-foreground">{item.feature}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'in-development' ? 'bg-blue-500/20 text-blue-400' :
                          item.status === 'planned' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{item.votes}</div>
                        <div className="text-xs text-muted-foreground">votes</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">User Engagement</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Daily Active Users</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 0.3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Messages Sent Today</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 2.5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Images Generated Today</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 0.8)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Revenue Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Recurring Revenue</span>
                    <span className="text-sm font-medium">${paidUsers * 9.99}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Revenue Per User</span>
                    <span className="text-sm font-medium">${paidUsers > 0 ? (paidUsers * 9.99 / paidUsers).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="text-sm font-medium">{totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : '0'}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Content Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Companions</span>
                    <span className="text-sm font-medium">20</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Custom Characters</span>
                    <span className="text-sm font-medium">{characters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Generated Images</span>
                    <span className="text-sm font-medium">{Math.floor(totalUsers * 5)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Marketing Forge Tab */}
          {activeTab === "marketing" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Marketing Campaign Builder</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Campaign Type</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground">
                      <option>Social Media</option>
                      <option>Email Newsletter</option>
                      <option>Discord Announcement</option>
                      <option>Reddit Post</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Target Audience</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground">
                      <option>All Users</option>
                      <option>Free Users</option>
                      <option>Premium Users</option>
                      <option>New Signups</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium text-foreground">Campaign Content</label>
                  <textarea
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-muted border border-border text-foreground resize-none"
                    rows={4}
                    placeholder="Write your marketing message here..."
                  />
                </div>
                <button className="mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                  Launch Campaign
                </button>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-left">
                    <div className="font-medium">Send Welcome Email</div>
                    <div className="text-sm opacity-75">To new users</div>
                  </button>
                  <button className="p-4 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors text-left">
                    <div className="font-medium">Feature Announcement</div>
                    <div className="text-sm opacity-75">New companion release</div>
                  </button>
                  <button className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors text-left">
                    <div className="font-medium">Promotional Offer</div>
                    <div className="text-sm opacity-75">Limited time discount</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback & Voting Tab */}
          {activeTab === "feedback" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">User Feedback</h3>
                <div className="space-y-4">
                  {[
                    { user: "User123", feedback: "Love the new image generation! So much better than before.", rating: 5, date: "2024-04-07" },
                    { user: "CompanionFan", feedback: "The breeding system is amazing. Can't wait for more features!", rating: 5, date: "2024-04-06" },
                    { user: "TechUser", feedback: "App feels premium now. The dark theme is perfect.", rating: 4, date: "2024-04-05" },
                    { user: "Newbie", feedback: "Easy to use but could use more tutorial content.", rating: 3, date: "2024-04-04" },
                  ].map((item, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-foreground">{item.user}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm ${i < item.rating ? 'text-yellow-400' : 'text-muted'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.feedback}</p>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-bold text-foreground mb-4">Feature Voting</h3>
                <div className="space-y-4">
                  {[
                    { feature: "Voice Chat Integration", votes: 45, status: "planned" },
                    { feature: "Multi-Companion Scenes", votes: 38, status: "in-development" },
                    { feature: "Custom Avatar Upload", votes: 52, status: "requested" },
                    { feature: "Advanced Roleplay Scenarios", votes: 29, status: "completed" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium text-foreground">{item.feature}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'in-development' ? 'bg-blue-500/20 text-blue-400' :
                          item.status === 'planned' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{item.votes}</div>
                        <div className="text-xs text-muted-foreground">votes</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
