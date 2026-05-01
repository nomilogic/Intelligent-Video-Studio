import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Film, Cloud, ShieldCheck, Mail, FolderOpen, FileVideo, FileAudio, FileImage, File, ChevronRight, X, FolderClosed, Download } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AccountDropdown } from "@/components/AccountDropdown";
import { DiamondPill } from "@/components/DiamondPill";
import { AuthModal } from "@/components/AuthModal";

interface CloudFolderItem {
  id: string;
  name: string;
  kind: "folder" | "file";
  mimeType?: string;
  size?: number;
  modifiedAt?: string;
  thumbnail?: string;
}

function CloudBrowserModal({
  provider,
  providerLabel,
  onClose,
}: {
  provider: string;
  providerLabel: string;
  onClose: () => void;
}) {
  const [path, setPath] = useState<{ id: string; name: string }[]>([{ id: "root", name: providerLabel }]);
  const [items, setItems] = useState<CloudFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const currentFolderId = path[path.length - 1].id;

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<CloudFolderItem[]>(
        `/cloud/${provider}/list${folderId !== "root" ? `?folderId=${encodeURIComponent(folderId)}` : ""}`,
      );
      setItems(data);
    } catch (err: any) {
      toast({ title: "Failed to list folder", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [provider, toast]);

  useEffect(() => { loadFolder(currentFolderId); }, [currentFolderId, loadFolder]);

  const openFolder = (item: CloudFolderItem) => {
    setPath((p) => [...p, { id: item.id, name: item.name }]);
  };

  const navigateTo = (idx: number) => {
    setPath((p) => p.slice(0, idx + 1));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  };

  const fileIcon = (item: CloudFolderItem) => {
    if (item.kind === "folder") return <FolderClosed className="w-4 h-4 text-yellow-400 shrink-0" />;
    const mt = item.mimeType ?? "";
    if (mt.startsWith("video/")) return <FileVideo className="w-4 h-4 text-blue-400 shrink-0" />;
    if (mt.startsWith("audio/")) return <FileAudio className="w-4 h-4 text-purple-400 shrink-0" />;
    if (mt.startsWith("image/")) return <FileImage className="w-4 h-4 text-green-400 shrink-0" />;
    return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const handleDownload = (item: CloudFolderItem) => {
    window.open(`/api/cloud/${provider}/download/${encodeURIComponent(item.id)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Cloud className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm flex-1">{providerLabel} — File Browser</span>
          <button onClick={onClose} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border text-xs text-muted-foreground overflow-x-auto scrollbar-none">
          {path.map((seg, idx) => (
            <span key={seg.id} className="flex items-center gap-1 shrink-0">
              {idx > 0 && <ChevronRight className="w-3 h-3" />}
              <button
                className={idx === path.length - 1 ? "text-foreground font-medium" : "hover:text-foreground transition-colors"}
                onClick={() => navigateTo(idx)}
              >
                {seg.name}
              </button>
            </span>
          ))}
        </div>
        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              This folder is empty
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors ${item.kind === "folder" ? "cursor-pointer" : ""}`}
                  onClick={() => item.kind === "folder" ? openFolder(item) : undefined}
                >
                  {fileIcon(item)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.name}</div>
                    {item.size ? <div className="text-[10px] text-muted-foreground">{formatSize(item.size)}</div> : null}
                  </div>
                  {item.kind === "file" && (
                    <button
                      title="Download / import"
                      className="opacity-0 hover:opacity-100 group-hover:opacity-60 shrink-0 p-1 rounded hover:bg-muted/60 transition-all"
                      onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                    >
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  {item.kind === "folder" && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [browseProvider, setBrowseProvider] = useState<string | null>(null);

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
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => setBrowseProvider(row.provider)} data-testid={`button-browse-${row.provider}`}>
                            <FolderOpen className="w-3.5 h-3.5 mr-1" /> Browse
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => disconnect(row.provider)} disabled={busy === `disc-${row.provider}`} data-testid={`button-disconnect-${row.provider}`}>
                            {busy === `disc-${row.provider}` && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                            Disconnect
                          </Button>
                        </div>
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
      {browseProvider && (
        <CloudBrowserModal
          provider={browseProvider}
          providerLabel={PROVIDER_LABELS[browseProvider] ?? browseProvider}
          onClose={() => setBrowseProvider(null)}
        />
      )}
    </div>
  );
}
