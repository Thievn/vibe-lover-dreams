import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Mail, Eye, EyeOff, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";

const signUpSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters").max(40),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const signInSchema = z.object({
  identifier: z
    .string()
    .min(3, "Enter your email or username (at least 3 characters)")
    .max(254, "Too long"),
  password: z.string().min(1, "Password required"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type SignInFormData = z.infer<typeof signInSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedRemember = localStorage.getItem("rememberMe");
    const savedIdentifier = localStorage.getItem("identifier");
    if (savedRemember === "true" && savedIdentifier) {
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("identifier");
    }
  }, [rememberMe]);

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem("identifier");
    if (saved && rememberMe) {
      signInForm.setValue("identifier", saved);
    }
  }, [rememberMe, signInForm]);

  const onSubmitSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { username: data.username, full_name: data.username },
        },
      });

      if (authError) throw authError;

      const uid = signUpData.user?.id;
      if (uid) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            user_id: uid,
            display_name: data.username,
          },
          { onConflict: "user_id" },
        );
        if (profileError) console.warn(profileError);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        toast.success("Account created — welcome to the forge.");
        navigate("/dashboard");
      } else {
        toast.message("Confirm your email", {
          description: "We sent a link to finish setup. You can sign in after confirming.",
        });
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSignIn = async (data: SignInFormData) => {
    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("identifier", data.identifier.trim());
      }

      const raw = data.identifier.trim();
      const { data: resolvedEmail, error: resolveErr } = await supabase.rpc("resolve_login_email", {
        p_login: raw,
      });
      if (resolveErr) throw resolveErr;
      const email = (resolvedEmail ?? "").trim().toLowerCase();
      if (!email) {
        throw new Error("Unknown email or username. Check spelling or use the email you signed up with.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      toast.success("Signed in — redirecting.");
      navigate("/dashboard");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/45 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-[#FF2D7B]/45 focus:ring-2 focus:ring-[#FF2D7B]/15 transition-shadow text-sm";

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center py-14 px-4 relative overflow-hidden font-sans">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${NEON}18, transparent),
            radial-gradient(ellipse 60% 40% at 100% 100%, hsl(280 50% 30% / 0.25), transparent),
            radial-gradient(ellipse 50% 30% at 0% 80%, hsl(170 70% 30% / 0.12), transparent)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,45,123,0.05)_1px,transparent_1px)] [background-size:40px_40px] opacity-50" />

      <div
        className={cn(
          "max-w-md w-full rounded-3xl border border-white/[0.08] p-8 md:p-10 relative z-10",
          "bg-black/55 backdrop-blur-2xl shadow-2xl",
        )}
        style={{ boxShadow: `0 0 80px ${NEON}10, inset 0 1px 0 rgba(255,255,255,0.06)` }}
      >
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10"
            style={{
              background: `linear-gradient(145deg, ${NEON}35, hsl(280 45% 25%))`,
              boxShadow: `0 0 28px ${NEON}30`,
            }}
          >
            <Flame className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-gothic text-2xl md:text-3xl tracking-wide text-white mb-1">
            <span style={{ color: NEON }}>LustForge</span> <span className="text-white/90">AI</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Access your empire</p>
        </div>

        <div className="flex mb-6 p-1 rounded-2xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => setMode("signIn")}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all",
              mode === "signIn"
                ? "text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground/80",
            )}
            style={
              mode === "signIn"
                ? {
                    background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 38%))`,
                    boxShadow: `0 0 24px ${NEON}35`,
                  }
                : undefined
            }
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signUp")}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all",
              mode === "signUp"
                ? "text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground/80",
            )}
            style={
              mode === "signUp"
                ? {
                    background: `linear-gradient(135deg, ${NEON}, hsl(280 45% 38%))`,
                    boxShadow: `0 0 24px ${NEON}35`,
                  }
                : undefined
            }
          >
            Sign up
          </button>
        </div>

        {mode === "signIn" ? (
          <form onSubmit={signInForm.handleSubmit(onSubmitSignIn)} className="space-y-4">
            <div>
              <label htmlFor="auth-signin-identifier" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email or username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="auth-signin-identifier"
                  {...signInForm.register("identifier")}
                  type="text"
                  autoComplete="username"
                  className={inputClass}
                  placeholder="you@email.com or Lustforge"
                />
              </div>
              {signInForm.formState.errors.identifier && (
                <p className="text-xs text-destructive mt-1.5">{signInForm.formState.errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-signin-password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="auth-signin-password"
                  {...signInForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-[hsl(170_100%_45%)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signInForm.formState.errors.password && (
                <p className="text-xs text-destructive mt-1.5">{signInForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-black/50 accent-[#FF2D7B]"
                />
                Remember me
              </label>
              <Link to="/reset-password" className="text-xs text-[hsl(170_100%_45%)] hover:underline underline-offset-2">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${NEON}, hsl(280 48% 40%), hsl(170 55% 32%))`,
                boxShadow: `0 0 36px ${NEON}33, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              {loading ? "Signing in…" : "Enter the forge"}
            </button>
          </form>
        ) : (
          <form onSubmit={signUpForm.handleSubmit(onSubmitSignUp)} className="space-y-4">
            <div>
              <label htmlFor="auth-signup-username" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Username
              </label>
              <p className="text-[10px] text-muted-foreground/90 mb-1.5 leading-snug">
                Shown in the app and used to sign in instead of email, if unique.
              </p>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="auth-signup-username"
                  {...signUpForm.register("username")}
                  type="text"
                  autoComplete="username"
                  className={inputClass}
                  placeholder="Pick a display name"
                />
              </div>
              {signUpForm.formState.errors.username && (
                <p className="text-xs text-destructive mt-1.5">{signUpForm.formState.errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-signup-email" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="auth-signup-email"
                  {...signUpForm.register("email")}
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              {signUpForm.formState.errors.email && (
                <p className="text-xs text-destructive mt-1.5">{signUpForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-signup-password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="auth-signup-password"
                  {...signUpForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-[hsl(170_100%_45%)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signUpForm.formState.errors.password && (
                <p className="text-xs text-destructive mt-1.5">{signUpForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-signup-confirm" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="auth-signup-confirm"
                  {...signUpForm.register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-[hsl(170_100%_45%)] transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signUpForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1.5">{signUpForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-black/50 accent-[#FF2D7B]"
              />
              Remember me on this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${NEON}, hsl(280 48% 40%), hsl(170 55% 32%))`,
                boxShadow: `0 0 36px ${NEON}33, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/terms-of-service" className="text-[#FF2D7B] hover:underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy" className="text-[hsl(170_100%_42%)] hover:underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
