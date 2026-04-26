import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Film } from "lucide-react";
import { useAuth, authErrorMessage } from "@/lib/auth-context";

function getQuery(name: string): string {
  return new URL(window.location.href).searchParams.get(name) ?? "";
}

export function VerifyPage() {
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<"pending" | "ok" | "fail">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getQuery("token");
    if (!token) {
      setStatus("fail");
      setError("Missing verification token in URL.");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("ok"))
      .catch((err) => {
        setStatus("fail");
        setError(authErrorMessage(err));
      });
  }, [verifyEmail]);

  return (
    <CenteredCard title="Email verification">
      {status === "pending" && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
        </div>
      )}
      {status === "ok" && (
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="w-4 h-4" /> Your email is verified.
          </div>
          <Link href="/projects"><Button>Go to my projects</Button></Link>
        </div>
      )}
      {status === "fail" && (
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="w-4 h-4" /> {error}
          </div>
          <Link href="/"><Button variant="outline">Back home</Button></Link>
        </div>
      )}
    </CenteredCard>
  );
}

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    const token = getQuery("token");
    if (!token) { setError("Missing reset token in URL."); return; }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => setLocation("/"), 1500);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CenteredCard title="Reset password">
      {done ? (
        <div className="flex items-center gap-2 text-sm text-emerald-500">
          <CheckCircle2 className="w-4 h-4" /> Password reset. Redirecting…
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} data-testid="input-new-password" />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} data-testid="input-confirm-password" />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Button type="submit" className="w-full" disabled={submitting} data-testid="button-reset-submit">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Set new password
          </Button>
        </form>
      )}
    </CenteredCard>
  );
}

export function OAuthCallbackPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");
    const redirect = url.searchParams.get("redirect") || "/projects";
    if (error) {
      setTimeout(() => setLocation(`/?oauth_error=${encodeURIComponent(error)}`), 1500);
    } else {
      setTimeout(() => setLocation(redirect), 600);
    }
  }, [setLocation]);
  return (
    <CenteredCard title="Signing you in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Finishing sign-in…
      </div>
    </CenteredCard>
  );
}

function CenteredCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">VideoAI</span>
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        {children}
      </Card>
    </div>
  );
}
