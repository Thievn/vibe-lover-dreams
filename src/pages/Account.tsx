import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Save, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";

export default function Account() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [tokens, setTokens] = useState<number | null>(null);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth", { replace: true });
      return;
    }
    setEmail(session.user.email ?? "");
    const meta = session.user.user_metadata as Record<string, string | undefined> | undefined;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, tokens_balance")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const fromProfile = profile?.display_name?.trim();
    setUsername(fromProfile || meta?.username?.trim() || meta?.full_name?.trim() || "");
    setTokens(profile?.tokens_balance ?? null);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveUsername = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      toast.error("Username must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 40) {
      toast.error("Username must be 40 characters or fewer.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("user_id", session.user.id);
      if (pErr) throw pErr;

      const { error: uErr } = await supabase.auth.updateUser({
        data: { username: trimmed, full_name: trimmed },
      });
      if (uErr) console.warn(uErr);

      setUsername(trimmed);
      toast.success("Username saved.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save username.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center font-sans">
        <p className="text-sm text-muted-foreground tracking-wide">Loading your vault…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-foreground font-sans relative overflow-hidden">
      <ParticleBackground />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FF2D7B]/[0.07] via-transparent to-[#0a1620]/80" />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: `radial-gradient(circle, ${NEON}55, transparent 70%)` }}
      />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-[hsl(170_80%_35%)]/15 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-lg px-4 py-10 md:py-14">
        <Link
          to="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-[#FF2D7B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 shadow-lg"
            style={{
              background: `linear-gradient(145deg, ${NEON}33, hsl(280 45% 22% / 0.5))`,
              boxShadow: `0 0 32px ${NEON}22`,
            }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-gothic text-2xl md:text-3xl tracking-wide text-white">Account</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-1">Vault & identity</p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-3xl border border-white/[0.08] bg-black/50 p-6 md:p-8 backdrop-blur-2xl shadow-2xl",
            "shadow-[0_0_80px_rgba(255,45,123,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          <div className="mb-8 flex items-start justify-between gap-4 rounded-2xl border border-[#FF2D7B]/20 bg-gradient-to-r from-[#FF2D7B]/[0.08] to-[hsl(280_50%_30%)]/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF2D7B]/20 text-[#FF2D7B]">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Token balance</p>
                <p className="font-gothic text-2xl text-white tabular-nums">{tokens ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 text-[#FF2D7B]" />
                Email
              </label>
              <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-muted-foreground">{email || "—"}</div>
              <p className="mt-2 text-xs text-muted-foreground/80">Email is tied to your sign-in and cannot be changed here.</p>
            </div>

            <div>
              <label
                htmlFor="account-username"
                className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                <UserRound className="h-3.5 w-3.5 text-[hsl(170_100%_42%)]" />
                Display username
              </label>
              <input
                id="account-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="How you appear in the forge"
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:border-[#FF2D7B]/50 focus:ring-2 focus:ring-[#FF2D7B]/20 transition-shadow",
                )}
                maxLength={40}
                autoComplete="nickname"
              />
              <p className="mt-2 text-xs text-muted-foreground/80">
                Capitalization is preserved. This name appears in your dashboard greeting.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void saveUsername()}
              disabled={saving}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white transition-transform",
                "disabled:opacity-50 disabled:pointer-events-none",
                "hover:scale-[1.01] active:scale-[0.99]",
              )}
              style={{
                background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 38%), hsl(170 70% 32%))`,
                boxShadow: `0 0 40px ${NEON}33, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save username"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
