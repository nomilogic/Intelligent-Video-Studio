import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

interface AuditRow {
  id: number;
  actorId: number | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
}

export function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ entries: AuditRow[] }>("/admin/audit-log?limit=200")
      .then((r) => setRows(r.entries))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">All admin actions are recorded here.</p>
      </div>
      {loading ? (
        <div className="text-muted-foreground text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Actor</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Target</th>
                <th className="text-left p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground p-6">No audit entries yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground tabular-nums">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-xs">{r.actorEmail ?? `#${r.actorId ?? "?"}`}</td>
                  <td className="p-3 text-xs font-mono">{r.action}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.targetType ? `${r.targetType}#${r.targetId}` : "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{r.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
