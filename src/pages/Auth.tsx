import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Flame } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  const ALLOWED_EMAIL = "lustforgeapp@gmail.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      toast.error("Access restricted. Waitlist mode active.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        toast.success("Account created! You can now sign in.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        toast.success("Signed in successfully");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20">
            <Flame className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-gothic text-5xl font-bold gradient-vice-text mb-2">LustForge</h1>
          <p className="text-muted-foreground text-lg">Waitlist Mode • Admin Access Only</p>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-10 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-8">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-lg placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-lg placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {isSignUp && (
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-muted border border-border text-lg placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:scale-[1.02] transition-transform disabled:opacity-50 mt-4"
            >
              {isLoading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="text-center mt-8">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline text-sm"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Only lustforgeapp@gmail.com is allowed during waitlist mode.
        </p>
      </div>
    </div>
  );
}