import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Film, Cloud, ShieldCheck, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AccountDropdown } from "@/components/AccountDropdown";
import { DiamondPill } from "@/components/DiamondPill";
import { AuthModal } from "@/components/AuthModal";

interface ProvidersResponse {
  providers: { provider: string; configured: boolean; reason: string | null }[];
  connections: Record<
    string,
    { connected: boolean; accountEmail?: string | null; accountName?: string | null }
  >;
}

const PROVIDER_LABELS: Record<string, string> = {
  google_drive: "Google Drive",
  dropbox: "Dropbox",
  onedrive: "Microsoft OneDrive",
  terabox: "TeraBox",
};

export function AccountPage() {
  const { user, loading, refresh, resendVerification } = useAuth();
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (user) setName(user.name ?? ""); }, [user]);

  const refreshProviders = async () => {
    if (!user) return;
    try {
      const p = await apiFetch<ProvidersResponse>("/cloud/providers");
      setProviders(p);
    } catch (err) {
      console.warn("providers refresh failed", err);
    }
  };

  useEffect(() => {
    if (user) refreshProviders();
  }, [user]);

  const connect = (provider: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    window.location.href = `/api/cloud/${provider}/connect?redirect=${encodeURIComponent("/account")}`;
  };

  const disconnect = async (provider: string) => {
    setBusy(`disc-${provider}`);
    try {
      await apiFetch(`/cloud/${provider}/disconnect`, { method: "POST" });
      toast({ title: "Disconnected" });
      await refreshProviders();
    } catch (err: any) {
      toast({ title: "Disconnect failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveName = async () => {
    setSavingName(true);
    try {
      await apiFetch("/auth/me", { method: "PATCH", body: { name } });
      await refresh();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="h-14 border-b border-border flex items-center px-6 gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">VideoAI</span>
        </Link>
        <div className="flex-1" />
        <DiamondPill onSignInRequired={() => setAuthOpen(true)} />
        <AccountDropdown onSignIn={() => setAuthOpen(true)} />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>

        {!user ? (
          <Card className="p-8 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Sign in to manage your account.</div>
            <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
          </Card>
        ) : (
          <>
            <Card className="p-6 space-y-4">
              <div className="font-semibold">Profile</div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} readOnly className="bg-muted" data-testid="input-email-readonly" />
                {!user.emailVerified && (
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <Mail className="w-3 h-3" />
                    <span>Not verified.</span>
                    <button
                      className="underline hover:text-amber-400"
                      onClick={async () => {
                        try { await resendVerification(); toast({ title: "Verification email sent" }); }
                        catch (err: any) { toast({ title: "Could not send", description: err.message, variant: "destructive" }); }
                      }}
                    >Resend verification</button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <div className="flex gap-2">
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
                  <Button onClick={saveName} disabled={savingName} data-testid="button-save-name">
                    {savingName && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Save
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <Cloud className="w-4 h-4" /> Cloud storage connections
              </div>
              <p className="text-xs text-muted-foreground">Connect a provider to import media and save exports back to your cloud.</p>
              <div className="space-y-2">
                {(providers?.providers ?? []).map((row) => {
                  const conn = providers?.connections[row.provider];
                  const label = PROVIDER_LABELS[row.provider] ?? row.provider;
                  const isComingSoon = row.provider === "terabox";
                  return (
                    <div key={row.provider} className="flex items-center justify-between border border-border rounded-md px-3 py-2.5" data-testid={`connection-${row.provider}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Cloud className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{label}</div>
                          {conn?.connected ? (
                            <div className="text-xs text-emerald-400 truncate">
                              Connected · {conn.accountEmail ?? conn.accountName ?? "account"}
                            </div>
                          ) : isComingSoon ? (
                            <div className="text-xs text-muted-foreground">Coming soon</div>
                          ) : !row.configured ? (
                            <div className="text-xs text-muted-foreground truncate">{row.reason ?? "Not configured on this server"}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Not connected</div>
                          )}
                        </div>
                      </div>
                      {conn?.connected ? (
                        <Button variant="outline" size="sm" onClick={() => disconnect(row.provider)} disabled={busy === `disc-${row.provider}`} data-testid={`button-disconnect-${row.provider}`}>
                          {busy === `disc-${row.provider}` && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!row.configured || isComingSoon}
                          onClick={() => connect(row.provider)}
                          data-testid={`button-connect-${row.provider}`}
                        >
                          {isComingSoon ? "Coming soon" : "Connect"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
