import { useState } from "react";
import { useAdminCompanions, type DbCompanion } from "@/hooks/useCompanions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Save, RefreshCw, Plus, Eye, EyeOff, ChevronDown, ChevronUp,
  Loader2, X, ImageIcon, Palette
} from "lucide-react";

const CompanionManager = () => {
  const { data: companions, isLoading, error } = useAdminCompanions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Partial<DbCompanion>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);

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
    const imagePrompt =
      getEdit(companion.id)?.image_prompt ?? companion.image_prompt;

    if (!imagePrompt) {
      toast.error("Enter an image prompt first.");
      return;
    }

    setGenerating((prev) => ({ ...prev, [companion.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-companion-image",
        {
          body: { companionId: companion.id, imagePrompt },
        }
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

  const addNewCompanion = async () => {
    const newId = `custom-${Date.now()}`;
    const { error } = await supabase.from("companions").insert({
      id: newId,
      name: "New Companion",
      tagline: "Enter a tagline",
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
      is_active: false,
    } as any);

    if (error) {
      toast.error("Failed to create: " + error.message);
    } else {
      toast.success("New companion created (inactive)!");
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      setExpandedId(newId);
    }
  };

  const hasChanges = (id: string) => Object.keys(getEdit(id)).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
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
        <button
          onClick={addNewCompanion}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Companion
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {companions?.length || 0} companions
      </p>

      {/* Companion List */}
      {filtered.map((companion) => {
        const isExpanded = expandedId === companion.id;
        const edit = getEdit(companion.id);
        const val = (field: keyof DbCompanion) =>
          edit[field] !== undefined ? edit[field] : companion[field];

        return (
          <div
            key={companion.id}
            className={`rounded-xl border bg-card transition-colors ${
              hasChanges(companion.id) ? "border-primary/50" : "border-border"
            }`}
          >
            {/* Summary Row */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : companion.id)}
            >
              {/* Portrait Preview */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${companion.gradient_from}, ${companion.gradient_to})`,
                }}
              >
                {companion.image_url ? (
                  <img
                    src={companion.image_url}
                    alt={companion.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white/80">
                    {companion.name.charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm truncate">
                    {companion.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      companion.is_active
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {companion.is_active ? "Active" : "Inactive"}
                  </span>
                  {hasChanges(companion.id) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary">
                      Unsaved
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {companion.gender} · {companion.role} · {companion.tags.slice(0, 3).join(", ")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive(companion);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title={companion.is_active ? "Deactivate" : "Activate"}
                >
                  {companion.is_active ? (
                    <Eye className="h-4 w-4 text-green-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded Editor */}
            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Name"
                    value={val("name") as string}
                    onChange={(v) => setField(companion.id, "name", v)}
                  />
                  <Field
                    label="Tagline"
                    value={val("tagline") as string}
                    onChange={(v) => setField(companion.id, "tagline", v)}
                  />
                  <Field
                    label="Gender"
                    value={val("gender") as string}
                    onChange={(v) => setField(companion.id, "gender", v)}
                  />
                  <Field
                    label="Orientation"
                    value={val("orientation") as string}
                    onChange={(v) => setField(companion.id, "orientation", v)}
                  />
                  <Field
                    label="Role"
                    value={val("role") as string}
                    onChange={(v) => setField(companion.id, "role", v)}
                  />
                  <Field
                    label="ID"
                    value={companion.id}
                    onChange={() => {}}
                    disabled
                  />
                </div>

                {/* Tags & Kinks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Tags (comma-separated)"
                    value={(val("tags") as string[]).join(", ")}
                    onChange={(v) =>
                      setField(
                        companion.id,
                        "tags",
                        v.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                  <Field
                    label="Kinks (comma-separated)"
                    value={(val("kinks") as string[]).join(", ")}
                    onChange={(v) =>
                      setField(
                        companion.id,
                        "kinks",
                        v.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>

                {/* Text Areas */}
                <TextArea
                  label="Bio"
                  value={val("bio") as string}
                  onChange={(v) => setField(companion.id, "bio", v)}
                  rows={3}
                />
                <TextArea
                  label="Appearance"
                  value={val("appearance") as string}
                  onChange={(v) => setField(companion.id, "appearance", v)}
                  rows={3}
                />
                <TextArea
                  label="Personality"
                  value={val("personality") as string}
                  onChange={(v) => setField(companion.id, "personality", v)}
                  rows={3}
                />
                <TextArea
                  label="System Prompt"
                  value={val("system_prompt") as string}
                  onChange={(v) => setField(companion.id, "system_prompt", v)}
                  rows={6}
                />

                {/* Gradient Colors */}
                <div className="flex items-center gap-4">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">From:</label>
                    <input
                      type="color"
                      value={val("gradient_from") as string}
                      onChange={(e) =>
                        setField(companion.id, "gradient_from", e.target.value)
                      }
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">To:</label>
                    <input
                      type="color"
                      value={val("gradient_to") as string}
                      onChange={(e) =>
                        setField(companion.id, "gradient_to", e.target.value)
                      }
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div
                    className="w-20 h-8 rounded"
                    style={{
                      background: `linear-gradient(135deg, ${val("gradient_from")}, ${val("gradient_to")})`,
                    }}
                  />
                </div>

                {/* Image Section */}
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">Portrait Management</h4>
                  </div>

                  {companion.image_url && (
                    <div className="flex items-start gap-4">
                      <img
                        src={companion.image_url}
                        alt={companion.name}
                        className="w-24 h-24 rounded-lg object-cover border border-border"
                      />
                      <p className="text-xs text-muted-foreground flex-1">
                        Current portrait loaded from storage.
                      </p>
                    </div>
                  )}

                  <TextArea
                    label="Image Prompt"
                    value={(val("image_prompt") as string) || ""}
                    onChange={(v) => setField(companion.id, "image_prompt", v)}
                    rows={3}
                    placeholder="Describe the portrait you want to generate..."
                  />

                  <button
                    onClick={() => regenerateImage(companion)}
                    disabled={generating[companion.id]}
                    className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {generating[companion.id] ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Regenerate Portrait
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <button
                    onClick={() => saveCompanion(companion)}
                    disabled={saving[companion.id] || !hasChanges(companion.id)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving[companion.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </button>
                  {hasChanges(companion.id) && (
                    <button
                      onClick={() =>
                        setEditData((prev) => {
                          const next = { ...prev };
                          delete next[companion.id];
                          return next;
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Discard
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No companions match your search.
        </p>
      )}
    </div>
  );
};

// Helper components
const Field = ({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
    />
  </div>
);

const TextArea = ({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
    />
  </div>
);

export default CompanionManager;
