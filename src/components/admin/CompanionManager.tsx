import { useState, useRef, useEffect } from "react";
import { useAdminCompanions, type DbCompanion } from "@/hooks/useCompanions";
import { COMPANION_RARITIES } from "@/lib/companionRarity";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Save, RefreshCw, Plus, Eye, EyeOff, ChevronDown, ChevronUp,
  Loader2, X, ImageIcon, Palette, ArrowLeft, Sparkles, MessageSquare, Send, Check, XCircle
} from "lucide-react";

type ViewMode = "list" | "edit" | "create";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  updates?: Array<{ id: string; fields: Record<string, any> }>;
  applied?: boolean;
}

const emptyCompanion: Omit<DbCompanion, "created_at" | "updated_at"> = {
  id: "",
  name: "",
  tagline: "",
  gender: "Female",
  orientation: "Bisexual",
  role: "Switch",
  tags: [],
  kinks: [],
  appearance: "",
  personality: "",
  bio: "",
  system_prompt: "",
  fantasy_starters: [],
  gradient_from: "#7B2D8E",
  gradient_to: "#FF2D7B",
  image_url: null,
  image_prompt: null,
  is_active: true,
  rarity: "common",
  backstory: "",
  static_image_url: null,
  animated_image_url: null,
  rarity_border_overlay_url: null,
};

const CompanionManager = () => {
  const { data: companions, isLoading, error } = useAdminCompanions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Partial<DbCompanion>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [createData, setCreateData] = useState({ ...emptyCompanion, id: `custom-${Date.now()}` });
  const [creatingLoading, setCreatingLoading] = useState(false);

  // Auto-fill state
  const [autoFillPrompt, setAutoFillPrompt] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);

  // Admin chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [applyingUpdates, setApplyingUpdates] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading companions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">Failed to load companions. Please try again.</p>
      </div>
    );
  }

  const filtered = (companions || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      c.gender.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  });

  const getEdit = (id: string): Partial<DbCompanion> => editData[id] || {};
  const setField = (id: string, field: string, value: any) => {
    setEditData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveCompanion = async (companion: DbCompanion) => {
    const changes = getEdit(companion.id);
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save.");
      return;
    }
    setSaving((prev) => ({ ...prev, [companion.id]: true }));
    try {
      const { error } = await supabase
        .from("companions")
        .update(changes as any)
        .eq("id", companion.id);
      if (error) throw error;
      toast.success(`${companion.name} updated!`);
      setEditData((prev) => {
        const next = { ...prev };
        delete next[companion.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving((prev) => ({ ...prev, [companion.id]: false }));
    }
  };

  const regenerateImage = async (companion: DbCompanion) => {
    const imagePrompt = getEdit(companion.id)?.image_prompt ?? companion.image_prompt;
    if (!imagePrompt) {
      toast.error("Enter an image prompt first.");
      return;
    }
    setGenerating((prev) => ({ ...prev, [companion.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-companion-image",
        { body: { companionId: companion.id, imagePrompt } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Portrait generated!");
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    } finally {
      setGenerating((prev) => ({ ...prev, [companion.id]: false }));
    }
  };

  const toggleActive = async (companion: DbCompanion) => {
    const newVal = !companion.is_active;
    const { error } = await supabase
      .from("companions")
      .update({ is_active: newVal } as any)
      .eq("id", companion.id);
    if (error) {
      toast.error("Toggle failed");
    } else {
      toast.success(newVal ? "Activated" : "Deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
    }
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setViewMode("edit");
  };

  const openCreate = () => {
    setCreateData({ ...emptyCompanion, id: `custom-${Date.now()}` });
    setAutoFillPrompt("");
    setViewMode("create");
  };

  const backToList = () => {
    setViewMode("list");
    setEditingId(null);
  };

  const createCompanion = async () => {
    if (!createData.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setCreatingLoading(true);
    try {
      const { error } = await supabase.from("companions").insert({
        id: createData.id,
        name: createData.name,
        tagline: createData.tagline,
        gender: createData.gender,
        orientation: createData.orientation,
        role: createData.role,
        tags: createData.tags,
        kinks: createData.kinks,
        appearance: createData.appearance,
        personality: createData.personality,
        bio: createData.bio,
        system_prompt: createData.system_prompt,
        fantasy_starters: createData.fantasy_starters as any,
        gradient_from: createData.gradient_from,
        gradient_to: createData.gradient_to,
        image_prompt: createData.image_prompt,
        is_active: createData.is_active,
        rarity: createData.rarity,
        backstory: createData.backstory,
        static_image_url: createData.static_image_url,
        animated_image_url: createData.animated_image_url,
        rarity_border_overlay_url: createData.rarity_border_overlay_url,
        image_url: createData.image_url,
      } as any);
      if (error) throw error;
      toast.success("Companion created!");
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      backToList();
    } catch (err: any) {
      toast.error("Create failed: " + err.message);
    } finally {
      setCreatingLoading(false);
    }
  };

  // Auto-fill from prompt using Grok
  const autoFillFromPrompt = async () => {
    if (!autoFillPrompt.trim()) {
      toast.error("Paste a companion profile first.");
      return;
    }
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: { prompt: autoFillPrompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fields = data.fields;
      if (!fields) throw new Error("No fields returned");

      // Merge into createData — only fill blank/default values
      setCreateData((prev) => {
        const updated = { ...prev };
        if (fields.name && !prev.name) updated.name = fields.name;
        if (fields.tagline && !prev.tagline) updated.tagline = fields.tagline;
        if (fields.gender && prev.gender === "Female") updated.gender = fields.gender;
        if (fields.orientation && prev.orientation === "Bisexual") updated.orientation = fields.orientation;
        if (fields.role && prev.role === "Switch") updated.role = fields.role;
        if (fields.tags?.length && prev.tags.length === 0) updated.tags = fields.tags;
        if (fields.kinks?.length && prev.kinks.length === 0) updated.kinks = fields.kinks;
        if (fields.appearance && !prev.appearance) updated.appearance = fields.appearance;
        if (fields.personality && !prev.personality) updated.personality = fields.personality;
        if (fields.bio && !prev.bio) updated.bio = fields.bio;
        if (fields.system_prompt && !prev.system_prompt) updated.system_prompt = fields.system_prompt;
        if (fields.fantasy_starters?.length && (prev.fantasy_starters as any[]).length === 0) updated.fantasy_starters = fields.fantasy_starters;
        if (fields.gradient_from && prev.gradient_from === "#7B2D8E") updated.gradient_from = fields.gradient_from;
        if (fields.gradient_to && prev.gradient_to === "#FF2D7B") updated.gradient_to = fields.gradient_to;
        if (fields.image_prompt && !prev.image_prompt) updated.image_prompt = fields.image_prompt;
        // Auto-generate an ID from name if still default
        if (fields.name && prev.id.startsWith("custom-")) {
          updated.id = fields.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
        return updated;
      });

      toast.success("Fields auto-filled from prompt!");
    } catch (err: any) {
      toast.error("Auto-fill failed: " + err.message);
    } finally {
      setAutoFilling(false);
    }
  };

  // Admin chat with Grok
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-companion-chat", {
        body: {
          message: userMsg,
          companions: (companions || []).map((c) => ({
            id: c.id, name: c.name, tagline: c.tagline, gender: c.gender,
            role: c.role, tags: c.tags, is_active: c.is_active,
          })),
          chatHistory: chatMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.type === "updates") {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.summary || "Ready to apply changes.",
            updates: data.updates,
            applied: false,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || "Done." },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const applyUpdates = async (msgIndex: number) => {
    const msg = chatMessages[msgIndex];
    if (!msg?.updates || msg.applied) return;
    setApplyingUpdates(true);

    try {
      for (const update of msg.updates) {
        const { error } = await supabase
          .from("companions")
          .update(update.fields as any)
          .eq("id", update.id);
        if (error) throw new Error(`Failed to update ${update.id}: ${error.message}`);
      }
      setChatMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, applied: true } : m))
      );
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      toast.success("Changes applied!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApplyingUpdates(false);
    }
  };

  const hasChanges = (id: string) => Object.keys(getEdit(id)).length > 0;

  // CREATE VIEW
  if (viewMode === "create") {
    return (
      <div className="space-y-4">
        <button onClick={backToList} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>
        <h2 className="text-lg font-bold text-foreground">Create New Companion</h2>

        {/* Auto-Fill from Prompt */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">Auto-Fill from Prompt</h4>
          </div>
          <p className="text-xs text-muted-foreground">Paste a full companion profile from Grok or anywhere else. Grok will parse it and fill in the fields below.</p>
          <textarea
            value={autoFillPrompt}
            onChange={(e) => setAutoFillPrompt(e.target.value)}
            rows={6}
            placeholder="Paste your full companion prompt/profile here..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
          />
          <button
            onClick={autoFillFromPrompt}
            disabled={autoFilling || !autoFillPrompt.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {autoFilling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Parsing with Grok...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Auto-Fill Fields</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Portrait & Appearance */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Portrait & Appearance</h4>
              </div>
              <div className="w-24 h-24 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${createData.gradient_from}, ${createData.gradient_to})` }}>
                <span className="text-2xl font-bold text-white/80">{createData.name.charAt(0) || "?"}</span>
              </div>
              <TextArea label="Appearance" value={createData.appearance} onChange={(v) => setCreateData(p => ({ ...p, appearance: v }))} rows={4} placeholder="Physical description..." />
              <TextArea label="Image Prompt" value={createData.image_prompt || ""} onChange={(v) => setCreateData(p => ({ ...p, image_prompt: v }))} rows={3} placeholder="Image generation prompt..." />
              <div className="flex items-center gap-4">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">From:</label>
                  <input type="color" value={createData.gradient_from} onChange={(e) => setCreateData(p => ({ ...p, gradient_from: e.target.value }))} className="w-8 h-8 rounded border border-border cursor-pointer" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">To:</label>
                  <input type="color" value={createData.gradient_to} onChange={(e) => setCreateData(p => ({ ...p, gradient_to: e.target.value }))} className="w-8 h-8 rounded border border-border cursor-pointer" />
                </div>
                <div className="w-20 h-8 rounded" style={{ background: `linear-gradient(135deg, ${createData.gradient_from}, ${createData.gradient_to})` }} />
              </div>
            </div>
          </div>

          {/* Right: Metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name *" value={createData.name} onChange={(v) => setCreateData(p => ({ ...p, name: v }))} />
              <Field label="Tagline" value={createData.tagline} onChange={(v) => setCreateData(p => ({ ...p, tagline: v }))} />
              <Field label="Gender" value={createData.gender} onChange={(v) => setCreateData(p => ({ ...p, gender: v }))} />
              <Field label="Orientation" value={createData.orientation} onChange={(v) => setCreateData(p => ({ ...p, orientation: v }))} />
              <Field label="Role" value={createData.role} onChange={(v) => setCreateData(p => ({ ...p, role: v }))} />
              <Field label="ID" value={createData.id} onChange={(v) => setCreateData(p => ({ ...p, id: v }))} />
            </div>
            <Field label="Tags (comma-separated)" value={createData.tags.join(", ")} onChange={(v) => setCreateData(p => ({ ...p, tags: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
            <Field label="Kinks (comma-separated)" value={createData.kinks.join(", ")} onChange={(v) => setCreateData(p => ({ ...p, kinks: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
            <TextArea label="Bio" value={createData.bio} onChange={(v) => setCreateData(p => ({ ...p, bio: v }))} rows={3} />
            <TextArea label="Backstory (2–4 paragraphs, blank line between)" value={createData.backstory} onChange={(v) => setCreateData(p => ({ ...p, backstory: v }))} rows={6} />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rarity</label>
              <select
                value={createData.rarity}
                onChange={(e) => setCreateData((p) => ({ ...p, rarity: e.target.value }))}
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground"
              >
                {COMPANION_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Static portrait URL" value={createData.static_image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, static_image_url: v || null }))} />
            <Field label="Animated portrait URL (gif/webp/mp4)" value={createData.animated_image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, animated_image_url: v || null }))} />
            <Field label="Custom border overlay URL (optional PNG/SVG)" value={createData.rarity_border_overlay_url || ""} onChange={(v) => setCreateData(p => ({ ...p, rarity_border_overlay_url: v || null }))} />
            <Field label="Legacy image_url (optional)" value={createData.image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, image_url: v || null }))} />
            <TextArea label="Personality" value={createData.personality} onChange={(v) => setCreateData(p => ({ ...p, personality: v }))} rows={3} />
            <TextArea label="Companion Prompt" value={createData.system_prompt} onChange={(v) => setCreateData(p => ({ ...p, system_prompt: v }))} rows={6} placeholder="Paste the full companion prompt here..." />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button onClick={createCompanion} disabled={creatingLoading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {creatingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Companion
          </button>
          <button onClick={backToList} className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // EDIT VIEW
  if (viewMode === "edit" && editingId) {
    const companion = companions?.find(c => c.id === editingId);
    if (!companion) {
      return <p className="text-muted-foreground">Companion not found.</p>;
    }
    const edit = getEdit(companion.id);
    const val = (field: keyof DbCompanion) => edit[field] !== undefined ? edit[field] : companion[field];

    return (
      <div className="space-y-4">
        <button onClick={backToList} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">{val("name") as string}</h2>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${companion.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
            {companion.is_active ? "Active" : "Inactive"}
          </span>
          {hasChanges(companion.id) && <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary">Unsaved</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Portrait + Appearance + Image Prompt + Regenerate */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Portrait & Appearance</h4>
              </div>

              {/* Portrait Preview */}
              <div className="flex items-start gap-4">
                <div className="w-32 h-32 rounded-lg overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${val("gradient_from")}, ${val("gradient_to")})` }}>
                  {(companion.static_image_url || companion.image_url) ? (
                    <img src={(companion.static_image_url || companion.image_url)!} alt={companion.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white/80">{companion.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">From:</label>
                      <input type="color" value={val("gradient_from") as string} onChange={(e) => setField(companion.id, "gradient_from", e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">To:</label>
                      <input type="color" value={val("gradient_to") as string} onChange={(e) => setField(companion.id, "gradient_to", e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    </div>
                  </div>
                  <div className="w-full h-6 rounded" style={{ background: `linear-gradient(135deg, ${val("gradient_from")}, ${val("gradient_to")})` }} />
                </div>
              </div>

              {/* Appearance */}
              <TextArea label="Appearance" value={val("appearance") as string} onChange={(v) => setField(companion.id, "appearance", v)} rows={4} placeholder="Physical description for reference..." />

              {/* Image Prompt */}
              <TextArea label="Image Prompt" value={(val("image_prompt") as string) || ""} onChange={(v) => setField(companion.id, "image_prompt", v)} rows={3} placeholder="Describe the portrait to generate..." />

              {/* Regenerate */}
              <button
                onClick={() => regenerateImage(companion)}
                disabled={generating[companion.id]}
                className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {generating[companion.id] ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Regenerate Portrait</>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: All metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name" value={val("name") as string} onChange={(v) => setField(companion.id, "name", v)} />
              <Field label="Tagline" value={val("tagline") as string} onChange={(v) => setField(companion.id, "tagline", v)} />
              <Field label="Gender" value={val("gender") as string} onChange={(v) => setField(companion.id, "gender", v)} />
              <Field label="Orientation" value={val("orientation") as string} onChange={(v) => setField(companion.id, "orientation", v)} />
              <Field label="Role" value={val("role") as string} onChange={(v) => setField(companion.id, "role", v)} />
              <Field label="ID" value={companion.id} onChange={() => {}} disabled />
            </div>
            <Field label="Tags (comma-separated)" value={(val("tags") as string[]).join(", ")} onChange={(v) => setField(companion.id, "tags", v.split(",").map(s => s.trim()).filter(Boolean))} />
            <Field label="Kinks (comma-separated)" value={(val("kinks") as string[]).join(", ")} onChange={(v) => setField(companion.id, "kinks", v.split(",").map(s => s.trim()).filter(Boolean))} />
            <TextArea label="Bio" value={val("bio") as string} onChange={(v) => setField(companion.id, "bio", v)} rows={3} />
            <TextArea label="Backstory (2–4 paragraphs)" value={val("backstory") as string} onChange={(v) => setField(companion.id, "backstory", v)} rows={6} />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rarity</label>
              <select
                value={(val("rarity") as string) || "common"}
                onChange={(e) => setField(companion.id, "rarity", e.target.value)}
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground"
              >
                {COMPANION_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Static portrait URL" value={(val("static_image_url") as string) || ""} onChange={(v) => setField(companion.id, "static_image_url", v || null)} />
            <Field label="Animated portrait URL" value={(val("animated_image_url") as string) || ""} onChange={(v) => setField(companion.id, "animated_image_url", v || null)} />
            <Field label="Border overlay URL (optional)" value={(val("rarity_border_overlay_url") as string) || ""} onChange={(v) => setField(companion.id, "rarity_border_overlay_url", v || null)} />
            <Field label="image_url (legacy)" value={(val("image_url") as string) || ""} onChange={(v) => setField(companion.id, "image_url", v || null)} />
            <TextArea label="Personality" value={val("personality") as string} onChange={(v) => setField(companion.id, "personality", v)} rows={3} />
            <TextArea label="Companion Prompt" value={val("system_prompt") as string} onChange={(v) => setField(companion.id, "system_prompt", v)} rows={6} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button onClick={() => saveCompanion(companion)} disabled={saving[companion.id] || !hasChanges(companion.id)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving[companion.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
          {hasChanges(companion.id) && (
            <button onClick={() => setEditData(prev => { const next = { ...prev }; delete next[companion.id]; return next; })} className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <X className="h-4 w-4" /> Discard
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); toggleActive(companion); }} className="ml-auto px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            {companion.is_active ? <><EyeOff className="h-4 w-4" /> Deactivate</> : <><Eye className="h-4 w-4" /> Activate</>}
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, tag, gender, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
          <Plus className="h-4 w-4" /> New Companion
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {companions?.length || 0} companions</p>

      {filtered.map((companion) => (
        <div
          key={companion.id}
          className="rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
          onClick={() => openEdit(companion.id)}
        >
          <div className="flex items-center gap-3 p-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${companion.gradient_from}, ${companion.gradient_to})` }}>
              {(companion.static_image_url || companion.image_url) ? (
                <img src={(companion.static_image_url || companion.image_url)!} alt={companion.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-white/80">{companion.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm truncate">{companion.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${companion.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {companion.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{companion.tagline}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{companion.gender} · {companion.role} · {companion.tags.slice(0, 3).join(", ")}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); toggleActive(companion); }}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title={companion.is_active ? "Deactivate" : "Activate"}
              >
                {companion.is_active ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No companions match your search.</p>
      )}

      {/* Admin Chat Panel */}
      <div className="fixed bottom-4 right-4 z-50">
        {chatOpen ? (
          <div className="w-96 h-[500px] rounded-xl border border-primary/30 bg-card shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Grok Admin Chat</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Ask Grok to modify companions.<br />
                  e.g. "Change Lilith's tagline to..."
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.updates && !msg.applied && (
                      <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                        <p className="text-[10px] font-bold opacity-70">
                          {msg.updates.length} update{msg.updates.length > 1 ? "s" : ""} ready
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => applyUpdates(i)}
                            disabled={applyingUpdates}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors disabled:opacity-50"
                          >
                            {applyingUpdates ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Apply
                          </button>
                          <button
                            onClick={() => setChatMessages(prev => prev.map((m, idx) => idx === i ? { ...m, updates: undefined } : m))}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-destructive/20 text-destructive text-xs hover:bg-destructive/30 transition-colors"
                          >
                            <XCircle className="h-3 w-3" /> Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                    {msg.applied && (
                      <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Applied
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  placeholder="Tell Grok what to change..."
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
            title="Open Grok Admin Chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50" />
  </div>
);

const TextArea = ({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y" />
  </div>
);

export default CompanionManager;
