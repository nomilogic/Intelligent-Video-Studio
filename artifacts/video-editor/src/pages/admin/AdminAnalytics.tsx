import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

interface DailyUser { date: string; count: number; }
interface DailyFeatureSpend { date: string; featureKey: string | null; total: number; }
interface AnalyticsResp {
  dailyUsers: DailyUser[];
  dailyDiamondsByFeature: DailyFeatureSpend[];
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AnalyticsResp>("/admin/analytics/daily?days=30")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="text-muted-foreground text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  }

  const totalSignups = data.dailyUsers.reduce((s, d) => s + d.count, 0);
  const totalSpent = data.dailyDiamondsByFeature.reduce((s, d) => s + Math.abs(d.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 30 days.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Signups</div>
          <div className="text-2xl font-bold tabular-nums">{totalSignups.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Diamonds spent</div>
          <div className="text-2xl font-bold tabular-nums">{totalSpent.toLocaleString()}</div>
        </Card>
      </div>
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Daily signups</div>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr><th className="text-left p-2">Date</th><th className="text-right p-2">New users</th></tr>
          </thead>
          <tbody>
            {data.dailyUsers.length === 0 ? (
              <tr><td colSpan={2} className="text-center text-muted-foreground p-4">No data.</td></tr>
            ) : data.dailyUsers.map((d) => (
              <tr key={d.date} className="border-t border-border">
                <td className="p-2 font-mono">{d.date}</td>
                <td className="p-2 text-right tabular-nums">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Diamond spend by feature</div>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Feature</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.dailyDiamondsByFeature.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-muted-foreground p-4">No spend yet.</td></tr>
            ) : data.dailyDiamondsByFeature.map((d, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2 font-mono">{d.date}</td>
                <td className="p-2">{d.featureKey ?? "(unknown)"}</td>
                <td className="p-2 text-right tabular-nums">{Math.abs(d.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
