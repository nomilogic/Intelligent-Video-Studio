import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

interface PackageRow {
  id: number;
  name: string;
  description: string | null;
  diamonds: number;
  bonusDiamonds: number;
  priceCents: number;
  currency: string;
  active: boolean;
  badge: string | null;
  sortOrder: number;
}

interface TransactionRow {
  id: number;
  userId: number;
  email: string | null;
  amount: number;
  kind: string;
  reason: string | null;
  createdAt: string;
}

export function AdminDiamonds() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [editing, setEditing] = useState<Partial<PackageRow> | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [p, t] = await Promise.all([
      apiFetch<{ packages: PackageRow[] }>("/admin/diamond-packages"),
      apiFetch<{ transactions: TransactionRow[] }>("/admin/transactions?limit=50"),
    ]);
    setPackages(p.packages);
    setTransactions(t.transactions);
  };

  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!editing || !editing.name) return;
    setBusy(true);
    try {
      const body = {
        name: editing.name,
        description: editing.description ?? null,
        diamonds: Number(editing.diamonds ?? 0),
        bonusDiamonds: Number(editing.bonusDiamonds ?? 0),
        priceCents: Number(editing.priceCents ?? 0),
        currency: editing.currency ?? "usd",
        active: editing.active ?? true,
        badge: editing.badge ?? null,
        sortOrder: Number(editing.sortOrder ?? 0),
      };
      if (editing.id) {
        await apiFetch(`/admin/diamond-packages/${editing.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/admin/diamond-packages", { method: "POST", body });
      }
      toast({ title: "Saved" });
      setEditing(null);
      await refresh();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this package?")) return;
    try {
      await apiFetch(`/admin/diamond-packages/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const refund = async (txId: number) => {
    if (!confirm("Refund this transaction (deducts the diamonds back)?")) return;
    try {
      await apiFetch(`/admin/transactions/${txId}/refund`, { method: "POST" });
      toast({ title: "Refunded" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Refund failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diamond shop</h1>
            <p className="text-sm text-muted-foreground">Edit packages users can buy.</p>
          </div>
          <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ active: true, currency: "usd", diamonds: 100, priceCents: 199 })}>
                <Plus className="w-4 h-4 mr-2" /> New package
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing?.id ? "Edit package" : "New package"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Diamonds</Label>
                    <Input type="number" value={editing?.diamonds ?? 0} onChange={(e) => setEditing({ ...editing, diamonds: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Bonus</Label>
                    <Input type="number" value={editing?.bonusDiamonds ?? 0} onChange={(e) => setEditing({ ...editing, bonusDiamonds: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Price (cents)</Label>
                    <Input type="number" value={editing?.priceCents ?? 0} onChange={(e) => setEditing({ ...editing, priceCents: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={editing?.currency ?? "usd"} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Badge</Label>
                    <Input value={editing?.badge ?? ""} onChange={(e) => setEditing({ ...editing, badge: e.target.value || null })} />
                  </div>
                  <div>
                    <Label>Sort order</Label>
                    <Input type="number" value={editing?.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={!!editing?.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">Package</th>
                <th className="text-right p-3">Diamonds</th>
                <th className="text-right p-3">Price</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{p.name} {p.badge && <span className="ml-2 text-xs text-primary">[{p.badge}]</span>}</div>
                    <div className="text-xs text-muted-foreground">{p.description}</div>
                  </td>
                  <td className="p-3 text-right tabular-nums">{p.diamonds.toLocaleString()}{p.bonusDiamonds > 0 && ` +${p.bonusDiamonds}`}</td>
                  <td className="p-3 text-right tabular-nums">${(p.priceCents / 100).toFixed(2)}</td>
                  <td className="p-3 text-xs">{p.active ? "active" : "hidden"}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Recent transactions</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">When</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 text-xs">{t.email ?? `#${t.userId}`}</td>
                  <td className="p-3 text-xs"><span className="font-mono">{t.kind}</span> {t.reason && `· ${t.reason}`}</td>
                  <td className={`p-3 text-right tabular-nums ${t.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.amount >= 0 ? "+" : ""}{t.amount}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {t.kind === "purchase" && (
                      <Button variant="ghost" size="sm" onClick={() => refund(t.id)} className="text-destructive">Refund</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
