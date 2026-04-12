import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Mail, Eye, EyeOff, Flame } from "lucide-react";

const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  identifier: z.string().min(1, "Email or username required"),
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

  const onSubmitSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { username: data.username },
        },
      });

      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user?.id,
        username: data.username,
        email: data.email,
      });

      if (profileError) throw profileError;

      toast.success("Account created successfully! Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSignIn = async (data: SignInFormData) => {
    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("identifier", data.identifier);
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: data.identifier.includes("@") ? data.identifier : undefined,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
        },
      });

      if (error) throw error;

      toast.success("Signed in successfully! Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-sm w-full bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <Flame className="h-6 w-6 text-primary mx-auto mb-2" />
          <h1 className="font-gothic text-lg font-bold mb-1">
            <span className="gradient-vice-text">LustForge</span> <span className="text-foreground">AI</span>
          </h1>
          <p className="text-xs text-muted-foreground">Access your empire</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex mb-4">
          <button
            type="button"
            onClick={() => setMode("signIn")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === "signIn"
                ? "bg-primary text-primary-foreground glow-pink shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signUp")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === "signUp"
                ? "bg-primary text-primary-foreground glow-pink shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Sign Up
          </button>
        </div>

        {mode === "signIn" ? (
          <form onSubmit={signInForm.handleSubmit(onSubmitSignIn)} className="space-y-3">
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  {...signInForm.register("identifier")}
                  type="text"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Email or Username"
                />
              </div>
              {signInForm.formState.errors.identifier && (
                <p className="text-xs text-destructive">{signInForm.formState.errors.identifier.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  {...signInForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-9 pr-9 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              {signInForm.formState.errors.password && (
                <p className="text-xs text-destructive">{signInForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded"
                />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Link to="/reset-password" className="text-xs text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium glow-pink hover:scale-105 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={signUpForm.handleSubmit(onSubmitSignUp)} className="space-y-3">
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  {...signUpForm.register("username")}
                  type="text"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Username"
                />
              </div>
              {signUpForm.formState.errors.username && (
                <p className="text-xs text-destructive">{signUpForm.formState.errors.username.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  {...signUpForm.register("email")}
                  type="email"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Email"
                />
              </div>
              {signUpForm.formState.errors.email && (
                <p className="text-xs text-destructive">{signUpForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  {...signUpForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-9 pr-9 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              {signUpForm.formState.errors.password && (
                <p className="text-xs text-destructive">{signUpForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  {...signUpForm.register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full pl-9 pr-9 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              {signUpForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-muted-foreground cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium glow-pink hover:scale-105 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            By signing up, you agree to our{' '}
            <Link to="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}