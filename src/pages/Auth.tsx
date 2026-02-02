import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);

    if (result.error) {
      if (result.isRateLimited) {
        toast({
          title: "Too many attempts",
          description: result.error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: isSignUp ? "Sign up failed" : "Sign in failed",
          description: result.error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: isSignUp ? "Welcome!" : "Welcome back!",
        description: isSignUp 
          ? "Your account has been created successfully." 
          : "You've signed in successfully.",
      });
      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 flex flex-col px-8 pt-8">
        {/* Title */}
        <h1 className="text-2xl font-bold mb-2 text-display">
          {isSignUp ? "Sign up" : "Log in"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isSignUp 
            ? "Create an account to start sharing videos" 
            : "Welcome back! Sign in to continue"
          }
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary/50 border-border/50 h-12 focus-glow transition-all duration-200 hover:bg-secondary/70"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/50 border-border/50 h-12 pr-12 focus-glow transition-all duration-200 hover:bg-secondary/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 font-semibold text-base shadow-lg"
          >
            {loading ? "Please wait..." : isSignUp ? "Sign up" : "Log in"}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center mt-8 text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-semibold hover:underline hover:text-primary/80 transition-colors"
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}