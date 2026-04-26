import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Gem, Loader2, Film, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useDiamonds } from "@/lib/diamonds-context";
import { useToast } from "@/hooks/use-toast";
import { AccountDropdown } from "@/components/AccountDropdown";
import { DiamondPill } from "@/components/DiamondPill";
import { AuthModal } from "@/components/AuthModal";

interface DiamondPackage {
  id: number;
  name: string;
  description: string | null;
  diamonds: number;
  bonusDiamonds: number;
  priceCents: number;
  currency: string;
  badge: string | null;
}

interface Transaction {
  id: number;
  amount: number;
  kind: string;
  reason: string | null;
  balanceAfter: number;
  createdAt: string;
}

export function DiamondsPage() {
  const { user, loading: authLoading } = useAuth();
  const { data, refresh, claimDaily } = useDiamonds();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [packages, setPackages] = useState<DiamondPackage[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ packages: DiamondPackage[]; stripeEnabled: boolean }>("/diamonds/packages").then((r) => {
      setPackages(r.packages);
      setStripeEnabled(r.stripeEnabled);
    });
  }, []);

  useEffect(() => {
    if (user) {
      apiFetch<{ transactions: Transaction[] }>("/diamonds/transactions").then((r) => setTransactions(r.transactions));
    }
  }, [user, data?.balance]);

  // Detect Stripe success/cancel return from query string
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("success")) {
      toast({ title: "Payment successful", description: "Diamonds will appear shortly." });
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname);
      refresh();
    } else if (url.searchParams.get("canceled")) {
      toast({ title: "Checkout canceled", variant: "destructive" });
      url.searchParams.delete("canceled");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  const handleClaim = async () => {
    setBusy("claim");
    try {
      const r = await claimDaily();
      toast({ title: `+${r.granted} diamonds`, description: `Balance: ${r.balance}` });
    } catch (err: any) {
      toast({ title: "Claim failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleBuy = async (pkg: DiamondPackage) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBusy(`buy-${pkg.id}`);
    try {
      const r = await apiFetch<{ url: string }>("/diamonds/checkout", {
        method: "POST",
        body: { packageId: pkg.id },
      });
      window.location.href = r.url;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Checkout failed";
      toast({ title: "Cannot start checkout", description: msg, variant: "destructive" });
      setBusy(null);
    }
  };

  const copyReferral = () => {
    if (!data) return;
    const link = `${window.location.origin}/?r=${data.referral.code}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Referral link copied" });
  };

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

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diamonds</h1>
            <p className="text-sm text-muted-foreground">Spend on premium AI actions, exports, and storage.</p>
          </div>
          {user && (
            <Card className="px-4 py-3 flex items-center gap-3">
              <Gem className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-2xl font-bold tabular-nums">{data?.balance ?? 0}</div>
                <div className="text-[11px] text-muted-foreground -mt-0.5">your balance</div>
              </div>
            </Card>
          )}
        </div>

        {!authLoading && !user && (
          <Card className="p-6 flex items-center gap-3">
            <Gem className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-medium">Sign in to start earning diamonds</div>
              <div className="text-muted-foreground">Get a daily login bonus, referral rewards, and a welcome grant.</div>
            </div>
            <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
          </Card>
        )}

        <Tabs defaultValue="shop">
          <TabsList>
            <TabsTrigger value="shop" data-testid="tab-shop">Buy</TabsTrigger>
            <TabsTrigger value="earn" data-testid="tab-earn">Earn free</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-4">
            {!stripeEnabled && (
              <Card className="p-4 mb-4 bg-amber-500/10 border-amber-500/30 text-sm">
                Stripe is not configured on this server. Purchases are disabled until <code>STRIPE_SECRET_KEY</code> is set.
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((p) => (
                <Card key={p.id} className="p-5 space-y-3 relative overflow-hidden" data-testid={`package-${p.id}`}>
                  {p.badge && (
                    <Badge className="absolute right-3 top-3 bg-primary">{p.badge}</Badge>
                  )}
                  <div className="font-semibold text-lg">{p.name}</div>
                  <div className="flex items-baseline gap-1">
                    <Gem className="w-4 h-4 text-cyan-400" />
                    <span className="text-3xl font-bold tabular-nums">{(p.diamonds + p.bonusDiamonds).toLocaleString()}</span>
                    {p.bonusDiamonds > 0 && (
                      <span className="text-xs text-emerald-400 ml-1">+{p.bonusDiamonds} bonus</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground min-h-[2.5em]">{p.description}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold">${(p.priceCents / 100).toFixed(2)}</span>
                    <Button
                      size="sm"
                      onClick={() => handleBuy(p)}
                      disabled={!stripeEnabled || busy === `buy-${p.id}`}
                      data-testid={`button-buy-${p.id}`}
                    >
                      {busy === `buy-${p.id}` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                      Buy
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="earn" className="mt-4 space-y-4">
            {user && data && (
              <>
                <Card className="p-5 flex items-center gap-4">
                  <Gem className="w-8 h-8 text-cyan-400" />
                  <div className="flex-1">
                    <div className="font-semibold">Daily login bonus</div>
                    <div className="text-sm text-muted-foreground">
                      Claim {data.dailyClaim.amount} diamonds every day, free.
                    </div>
                  </div>
                  {data.dailyClaim.claimedToday ? (
                    <Button variant="outline" disabled data-testid="button-already-claimed">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Claimed
                    </Button>
                  ) : (
                    <Button onClick={handleClaim} disabled={busy === "claim"} data-testid="button-claim-daily">
                      {busy === "claim" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Claim {data.dailyClaim.amount}
                    </Button>
                  )}
                </Card>
                <Card className="p-5 space-y-3">
                  <div className="font-semibold">Refer a friend</div>
                  <div className="text-sm text-muted-foreground">
                    Both of you get {data.referral.bonus} diamonds when they sign up with your link.
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 rounded bg-muted text-sm flex-1 truncate" data-testid="referral-link">
                      {window.location.origin}/?r={data.referral.code}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyReferral} data-testid="button-copy-referral">
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                </Card>
              </>
            )}
            {!user && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Sign in to claim your daily bonus and start referring friends.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {!user ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">Sign in to view history.</Card>
            ) : transactions.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</Card>
            ) : (
              <Card className="divide-y">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 text-sm" data-testid={`tx-${t.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.reason ?? t.kind}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString()} · {t.kind}
                      </div>
                    </div>
                    <div className={`tabular-nums font-semibold ${t.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.amount >= 0 ? "+" : ""}{t.amount}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                      = {t.balanceAfter}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
