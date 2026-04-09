import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";
import { Mail, Lock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SITE_URL } from "@/config/auth";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const confirmedRedirect = params.get("confirmed") === "true";

    if (confirmedRedirect) {
      setEmailConfirmed(true);
      setConfirmationMessage(
        "Your email address has been confirmed successfully. You can now continue to LustForge."
      );
    }

    const handleOAuthRedirect = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user && !confirmedRedirect) {
          navigate("/");
          return;
        }

        const { data, error } = await supabase.auth.getSessionFromUrl();
        if (error) {
          console.warn("OAuth redirect parse error:", error.message);
          return;
        }

        if (data?.session) {
          toast.success("Welcome back 🔥");
          if (!confirmedRedirect) {
            navigate("/");
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
      }
    };

    // Log Supabase configuration to ensure correct env vars are used
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Supabase Anon Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Key is set" : "Key is not set");

    handleOAuthRedirect();
  }, [navigate, location.search]);

  const handleDevLogin = async () => {
    if (email.toLowerCase() === "thievnsden@gmail.com") {
      setLoading(true);
      try {
        // Attempt to create a session or bypass login for this specific email
        const { data, error } = await supabase.auth.signInWithPassword({
          email: "thievnsden@gmail.com",
          password: password || "placeholder_password", // Use provided password or a placeholder
        });

        if (error) {
          console.error("Dev Login Error:", error);
          // If login fails, attempt to create a user and retry
          const { data: createUserData, error: createUserError } = await supabase.functions.invoke("create-user", {
            body: JSON.stringify({ email: "thievnsden@gmail.com", password: password || "placeholder_password" }),
          });

          if (!createUserError && createUserData?.user?.id) {
            const { error: retryError } = await supabase.auth.signInWithPassword({
              email: "thievnsden@gmail.com",
              password: password || "placeholder_password",
            });
            if (!retryError) {
              toast.success("Dev Login: Account created and signed in. Welcome back 🔥");
              navigate("/");
              return;
            } else {
              console.error("Dev Login Retry Error:", retryError);
              toast.error("Dev Login failed on retry. Check console for details.");
            }
          } else {
            console.error("Dev Login Create User Error:", createUserError);
            toast.error("Dev Login failed to create user. Check console for details.");
          }
        } else {
          toast.success("Dev Login successful. Welcome back 🔥");
          navigate("/");
        }
      } catch (err) {
        console.error("Dev Login Exception:", err);
        toast.error("Dev Login failed. Check console for details.");
      } finally {
        setLoading(false);
      }
    } else {
      toast.error("Dev Login is restricted to admin email only.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${SITE_URL}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Check your email.");
        setMode("login");
      } else if (mode === "login") {
        const ALLOWED_EMAIL = "thievnsden@gmail.com";
        if (email.toLowerCase() !== ALLOWED_EMAIL) {
          toast.error("Access restricted to admin only. This is a private waitlist.");
          setLoading(false);
          return;
        }

        console.log("Attempting login with email:", email);
        console.log("Password provided (not logged for security):"); // Avoid logging password in production
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log("SignInWithPassword Response:", data);
        console.log("SignInWithPassword Error:", error);

        if (error) {
          const fallbackErrorText = String(error?.message || "");
          if (
            fallbackErrorText.includes("Invalid login credentials") ||
            (email.toLowerCase() !== "thievnsden@gmail.com" && fallbackErrorText.includes("Email not confirmed")) ||
            fallbackErrorText.includes("User not found")
          ) {
            const { data: createUserData, error: createUserError } = await supabase.functions.invoke("create-user", {
              body: JSON.stringify({ email: email.toLowerCase(), password }),
            });

            if (!createUserError && createUserData?.user?.id) {
              const { error: signInRetryError } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              if (!signInRetryError) {
                toast.success("Account created and signed in. Welcome back 🔥");
                navigate("/");
                return;
              }
            }
          }
          throw error;
        }

        toast.success("Welcome back 🔥");
        navigate("/");
      } else {
        const ALLOWED_EMAIL = "thievnsden@gmail.com";
        if (email.toLowerCase() !== ALLOWED_EMAIL) {
          toast.error("Access restricted to admin only. This is a private waitlist.");
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          toast.error("Passwords don't match");
          setLoading(false);
          return;
        }

        const { data: createUserData, error: createUserError } = await supabase.functions.invoke("create-user", {
          body: JSON.stringify({ email: email.toLowerCase(), password }),
        });

        if (createUserError) {
          toast.error(createUserError.message || "Failed to create account.");
          setLoading(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        toast.success("Account created and signed in. Welcome back 🔥");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-4">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LustForge
        </button>

        <div className="rounded-2xl border border-border bg-card p-8 glow-purple">
          <h1 className="font-gothic text-2xl font-bold text-center gradient-vice-text mb-1">
            {mode === "login" ? "Welcome Back" : mode === "signup" ? "Join LustForge" : "Reset Password"}
          </h1>
          <p className="text-center text-muted-foreground text-sm mb-6">
            {mode === "login"
              ? "Sign in to continue"
              : mode === "signup"
              ? "Create your account to begin"
              : "Enter your email to receive a reset link"}
          </p>

          {emailConfirmed && (
            <div className="rounded-[2rem] border border-emerald-500/80 bg-emerald-950/90 p-6 mb-6 shadow-2xl shadow-emerald-950/40 text-emerald-100">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 place-content-center rounded-3xl bg-emerald-500/15 text-emerald-300 shadow-inner shadow-emerald-900/30">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">LustForge verification</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Email confirmed</h2>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-500/10 bg-emerald-950/70 p-4">
                  <p className="text-sm leading-7 text-emerald-100/85">
                    Your access is now unlocked. We’ve verified your email and reserved your place in the private waitlist.
                    Your LustForge companion universe is ready whenever you are.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-emerald-300">Next step: tap continue and start crafting your first companion experience.</p>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                  >
                    Continue to LustForge
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}

            {mode === "signup" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={handleDevLogin}
                className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                disabled={loading}
              >
                Dev Login as Admin
              </button>
            )}
          </form>

          {mode !== "forgot" && (
            <>
              <p className="text-xs text-muted-foreground text-center py-2">
                {mode === "signup" && "Waitlist mode - Limited access only"}
              </p>
            </>
          )}

          <div className="text-center text-sm text-muted-foreground mt-4 space-y-1">
            {mode === "login" && (
              <>
                <p>
                  Don't have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                    Sign Up
                  </button>
                </p>
                <p>
                  <button onClick={() => setMode("forgot")} className="text-primary hover:underline">
                    Forgot password?
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-primary hover:underline">
                  Sign In
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p>
                <button onClick={() => setMode("login")} className="text-primary hover:underline">
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By signing up, you confirm you are 18+ and agree to our Terms of Service.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
