import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Trash2 } from "lucide-react";

interface AdminProjectRow {
  id: number;
  name: string;
  duration: number;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
  updatedAt: string;
  ownerEmail: string | null;
  ownerId: number | null;
}

export function AdminProjects() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ projects: AdminProjectRow[] }>(`/admin/projects?q=${encodeURIComponent(q)}`);
      setRows(r.projects);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const remove = async (id: number) => {
    if (!confirm("Delete this project?")) return;
    try {
      await apiFetch(`/admin/projects/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Inspect and clean up timelines across all users.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); refresh(); }} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name/owner" className="pl-7 h-9 w-64" />
          </div>
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3">Project</th>
              <th className="text-left p-3">Owner</th>
              <th className="text-right p-3">Duration</th>
              <th className="text-left p-3">Updated</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-muted-foreground p-6">
                <Loader2 className="inline w-4 h-4 animate-spin" />
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-muted-foreground p-6">No projects.</td></tr>
            ) : rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  <div className="font-medium truncate max-w-[260px]">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.canvasWidth}×{p.canvasHeight}</div>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {p.ownerEmail ?? <span className="italic">(orphan)</span>}
                </td>
                <td className="p-3 text-right tabular-nums">{p.duration.toFixed(1)}s</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(p.updatedAt).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
