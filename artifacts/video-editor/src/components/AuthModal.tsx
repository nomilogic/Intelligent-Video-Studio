import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, authErrorMessage } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMode?: "login" | "signup";
  reason?: string;
  redirectAfter?: string;
}

export function AuthModal({ open, onOpenChange, defaultMode = "login", reason, redirectAfter }: AuthModalProps) {
  const { signinWithPassword, signupWithPassword, forgotPassword } = useAuth();
  const [mode, setMode] = useState<string>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referral, setReferral] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setForgotSent(false);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await signupWithPassword({
          email,
          password,
          name: name || undefined,
          referralCode: referral || undefined,
        });
      } else if (mode === "forgot") {
        await forgotPassword(email);
        setForgotSent(true);
        return;
      } else {
        await signinWithPassword(email, password);
      }
      onOpenChange(false);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const startGoogle = () => {
    const params = new URLSearchParams();
    if (redirectAfter) params.set("redirect", redirectAfter);
    window.location.href = `/api/auth/google/start${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle>
            {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}
          </DialogTitle>
          <DialogDescription>
            {reason ?? "Save projects, earn diamonds, and unlock premium features."}
          </DialogDescription>
        </DialogHeader>

        {mode !== "forgot" && (
          <Tabs value={mode === "signup" ? "signup" : "login"} onValueChange={setMode} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login" data-testid="tab-login">Sign in</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" />
            <TabsContent value="signup" />
          </Tabs>
        )}

        {forgotSent ? (
          <div className="text-sm text-muted-foreground py-4">
            If an account exists for that email, a password reset link is on the way. Check your inbox in a minute.
            <div className="pt-3">
              <Button variant="outline" size="sm" onClick={() => { setMode("login"); setForgotSent(false); }}>
                Back to sign in
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Display name (optional)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" data-testid="input-name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="input-email"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  data-testid="input-password"
                />
              </div>
            )}
            {mode === "signup" && (
              <div>
                <Label htmlFor="referral">Referral code (optional)</Label>
                <Input id="referral" value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="abc12345" data-testid="input-referral" />
              </div>
            )}
            {error && <div className="text-sm text-destructive" data-testid="auth-error">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-auth">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {mode === "login" && (
                <button type="button" className="hover:underline" onClick={() => setMode("forgot")}>
                  Forgot password?
                </button>
              )}
              {mode === "forgot" && (
                <button type="button" className="hover:underline" onClick={() => setMode("login")}>
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}

        {mode !== "forgot" && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={startGoogle} data-testid="button-google">
              Continue with Google
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
