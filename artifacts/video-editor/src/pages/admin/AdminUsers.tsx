import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Gem, KeyRound, Trash2, ShieldCheck } from "lucide-react";

interface AdminUserRow {
  id: number;
  email: string;
  name: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  banned: boolean;
  createdAt: string;
  balance: number;
}

export function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [granting, setGranting] = useState<AdminUserRow | null>(null);
  const [grantAmount, setGrantAmount] = useState("100");
  const [grantReason, setGrantReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ users: AdminUserRow[] }>(`/admin/users?q=${encodeURIComponent(q)}`);
      setUsers(r.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const grant = async () => {
    if (!granting) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/users/${granting.id}/grant`, {
        method: "POST",
        body: { amount: parseInt(grantAmount, 10), reason: grantReason || "Admin adjustment" },
      });
      toast({ title: `Granted ${grantAmount} diamonds` });
      setGranting(null);
      setGrantReason("");
      await refresh();
    } catch (err: any) {
      toast({ title: "Grant failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggleAdmin = async (u: AdminUserRow) => {
    try {
      await apiFetch(`/admin/users/${u.id}`, {
        method: "PATCH",
        body: { role: u.role === "admin" ? "user" : "admin" },
      });
      toast({ title: "Role updated" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleBan = async (u: AdminUserRow) => {
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: "PATCH", body: { banned: !u.banned } });
      toast({ title: u.banned ? "Unbanned" : "Banned" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const forceReset = async (u: AdminUserRow) => {
    try {
      await apiFetch(`/admin/users/${u.id}/force-reset`, { method: "POST" });
      toast({ title: "Password reset triggered" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (u: AdminUserRow) => {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: "DELETE" });
      toast({ title: "User deleted" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">View and manage all signed-up users.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); refresh(); }} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email/name" className="pl-7 h-9 w-64" data-testid="input-user-search" />
          </div>
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-right p-3">Diamonds</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Joined</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-muted-foreground p-6">
                <Loader2 className="inline w-4 h-4 animate-spin" />
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-muted-foreground p-6">No users.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-t border-border" data-testid={`user-row-${u.id}`}>
                <td className="p-3">
                  <div className="font-medium">{u.name ?? u.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.email}
                    {!u.emailVerified && <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500/40">unverified</Badge>}
                    {u.banned && <Badge variant="outline" className="ml-2 text-rose-500 border-rose-500/40">banned</Badge>}
                  </div>
                </td>
                <td className="p-3 text-right tabular-nums">{u.balance ?? 0}</td>
                <td className="p-3">
                  {u.role === "admin" ? (
                    <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">admin</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">user</span>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setGranting(u)} title="Grant diamonds">
                    <Gem className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleAdmin(u)} title="Toggle admin">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleBan(u)} title={u.banned ? "Unban" : "Ban"}>
                    {u.banned ? "Unban" : "Ban"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => forceReset(u)} title="Force password reset">
                    <KeyRound className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(u)} className="text-destructive" title="Delete user">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!granting} onOpenChange={(v) => !v && setGranting(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Grant diamonds to {granting?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (use a negative number to deduct)</Label>
              <Input type="number" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} data-testid="input-grant-amount" />
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={grantReason} onChange={(e) => setGrantReason(e.target.value)} placeholder="Refund / promo / fix" data-testid="input-grant-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGranting(null)}>Cancel</Button>
            <Button onClick={grant} disabled={busy} data-testid="button-confirm-grant">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
