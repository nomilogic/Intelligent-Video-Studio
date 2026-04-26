import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FeatureFlag {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  requiresAuth: boolean;
  requiresDiamonds: boolean;
  costDiamonds: number;
}

export function AdminFeatures() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ flags: FeatureFlag[]; settings: Record<string, string> }>("/admin/feature-flags");
      setFlags(r.flags);
      setSettings(r.settings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const updateFlag = async (key: string, patch: Partial<FeatureFlag>) => {
    setPending(`flag-${key}`);
    try {
      await apiFetch(`/admin/feature-flags/${encodeURIComponent(key)}`, { method: "PATCH", body: patch });
      toast({ title: "Updated" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setPending(`set-${key}`);
    try {
      await apiFetch(`/admin/settings/${encodeURIComponent(key)}`, { method: "PATCH", body: { value } });
      toast({ title: "Updated" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature flags & costs</h1>
        <p className="text-sm text-muted-foreground">Toggle premium features, set their diamond cost, and require sign-in.</p>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-left px-4 py-2">Feature</th>
                <th className="text-center px-4 py-2 w-20">Enabled</th>
                <th className="text-center px-4 py-2 w-32">Login required</th>
                <th className="text-center px-4 py-2 w-32">Charges diamonds</th>
                <th className="text-center px-4 py-2 w-28">Cost</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.key} className="border-t border-border" data-testid={`flag-${f.key}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{f.label}</div>
                    <div className="text-xs text-muted-foreground">{f.description ?? f.key}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={f.enabled}
                      disabled={pending === `flag-${f.key}`}
                      onCheckedChange={(v) => updateFlag(f.key, { enabled: v })}
                      data-testid={`flag-enabled-${f.key}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={f.requiresAuth}
                      disabled={pending === `flag-${f.key}`}
                      onCheckedChange={(v) => updateFlag(f.key, { requiresAuth: v })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={f.requiresDiamonds}
                      disabled={pending === `flag-${f.key}`}
                      onCheckedChange={(v) => updateFlag(f.key, { requiresDiamonds: v })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Input
                      type="number"
                      className="h-8 w-20 mx-auto text-center tabular-nums"
                      defaultValue={f.costDiamonds}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (!Number.isNaN(n) && n !== f.costDiamonds) updateFlag(f.key, { costDiamonds: n });
                      }}
                      data-testid={`flag-cost-${f.key}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-bold mb-3">Settings</h2>
        <Card className="p-4 space-y-3">
          {Object.keys(settings).length === 0 ? (
            <div className="text-sm text-muted-foreground">No settings yet.</div>
          ) : Object.entries(settings).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-3 items-center">
              <Label className="text-xs font-mono">{key}</Label>
              <Input
                className="col-span-2"
                defaultValue={value}
                onBlur={(e) => { if (e.target.value !== value) updateSetting(key, e.target.value); }}
                data-testid={`setting-${key}`}
              />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
