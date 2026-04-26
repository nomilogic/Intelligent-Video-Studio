import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { Loader2, Users, FolderKanban, Gem, FileClock } from "lucide-react";

interface Stats {
  users: { total: number; today: number; thisWeek: number; thisMonth: number };
  projects: { total: number };
  exports: { total: number };
  diamondsGranted: number;
  topUsers: { id: number; email: string; name: string | null; balance: number | null }[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch<Stats>("/admin/stats").then(setStats).catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <div className="text-muted-foreground text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading stats…</div>;
  }

  const cards = [
    { label: "Total users", value: stats.users.total.toLocaleString(), Icon: Users, hint: `+${stats.users.thisWeek} new in 7d` },
    { label: "Today", value: stats.users.today.toLocaleString(), Icon: Users, hint: "New signups today" },
    { label: "Projects", value: stats.projects.total.toLocaleString(), Icon: FolderKanban, hint: "All-time" },
    { label: "Exports", value: stats.exports.total.toLocaleString(), Icon: FileClock, hint: "Completed exports" },
    { label: "Diamonds purchased", value: stats.diamondsGranted.toLocaleString(), Icon: Gem, hint: "All-time gross" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Quick view of platform health.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <c.Icon className="w-3.5 h-3.5" /> {c.label}
            </div>
            <div className="text-3xl font-bold tabular-nums">{c.value}</div>
            <div className="text-[11px] text-muted-foreground">{c.hint}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Top diamond holders</div>
        <table className="w-full text-sm">
          <tbody>
            {stats.topUsers.length === 0 ? (
              <tr><td className="text-muted-foreground p-3 text-center">No users yet.</td></tr>
            ) : stats.topUsers.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-2">{u.name ?? u.email}</td>
                <td className="p-2 text-xs text-muted-foreground">{u.email}</td>
                <td className="p-2 text-right tabular-nums font-medium">{(u.balance ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
