import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { TEMPLATES } from "@/lib/templates";
import {
  Search, Star, StarOff, Trash2, RefreshCw, CheckCircle2, XCircle,
  Layout, Film, Loader2, Globe, Lock,
} from "lucide-react";

interface SharedTemplate {
  id: number;
  name: string;
  description: string;
  emoji: string;
  authorId: number;
  authorEmail: string;
  featured: boolean;
  approved: boolean;
  createdAt: string;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export function AdminTemplates() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [shared, setShared] = useState<SharedTemplate[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);
  const [actionPending, setActionPending] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ templates: SharedTemplate[] }>("/admin/shared-templates")
      .then((r) => setShared(r.templates))
      .catch(() => setShared([]))
      .finally(() => setSharedLoading(false));
  }, []);

  const builtInCategories = useMemo(() => {
    const cats = new Set<string>();
    TEMPLATES.forEach((t) => {
      if (t.canvasWidth === 1080 && t.canvasHeight === 1920) cats.add("9:16 Vertical");
      else if (t.canvasWidth === 1920 && t.canvasHeight === 1080) cats.add("16:9 Landscape");
      else if (t.canvasWidth === 1080 && t.canvasHeight === 1080) cats.add("1:1 Square");
      else cats.add("Other");
    });
    return ["all", ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase();
    return TEMPLATES.filter((t) => {
      const cat =
        t.canvasWidth === 1080 && t.canvasHeight === 1920 ? "9:16 Vertical" :
        t.canvasWidth === 1920 && t.canvasHeight === 1080 ? "16:9 Landscape" :
        t.canvasWidth === 1080 && t.canvasHeight === 1080 ? "1:1 Square" : "Other";
      const matchesCat = categoryFilter === "all" || cat === categoryFilter;
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.key.includes(q) || t.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, categoryFilter]);

  const handleFeature = async (id: number, featured: boolean) => {
    setActionPending(id);
    try {
      await apiFetch(`/admin/shared-templates/${id}/feature`, { method: "PATCH", body: JSON.stringify({ featured }) });
      setShared((prev) => prev.map((t) => t.id === id ? { ...t, featured } : t));
    } catch { } finally { setActionPending(null); }
  };

  const handleApprove = async (id: number, approved: boolean) => {
    setActionPending(id);
    try {
      await apiFetch(`/admin/shared-templates/${id}/approve`, { method: "PATCH", body: JSON.stringify({ approved }) });
      setShared((prev) => prev.map((t) => t.id === id ? { ...t, approved } : t));
    } catch { } finally { setActionPending(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this shared template?")) return;
    setActionPending(id);
    try {
      await apiFetch(`/admin/shared-templates/${id}`, { method: "DELETE" });
      setShared((prev) => prev.filter((t) => t.id !== id));
    } catch { } finally { setActionPending(null); }
  };

  const verticalCount = TEMPLATES.filter((t) => t.canvasHeight > t.canvasWidth).length;
  const horizontalCount = TEMPLATES.filter((t) => t.canvasWidth >= t.canvasHeight * 1.5).length;
  const squareCount = TEMPLATES.filter((t) => Math.abs(t.canvasWidth - t.canvasHeight) < 10).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Template Management</h1>
        <p className="text-sm text-muted-foreground">Browse all built-in templates and manage community-shared templates.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Built-in" value={TEMPLATES.length} sub="All formats" />
        <StatCard label="9:16 Vertical" value={verticalCount} sub="Social / reels" />
        <StatCard label="16:9 Landscape" value={horizontalCount} sub="Video / widescreen" />
        <StatCard label="1:1 Square" value={squareCount} sub="Instagram / posts" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Layout className="w-4 h-4" /> Built-in Templates ({filteredTemplates.length} shown)</h2>
        <div className="flex gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search by name or key…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {builtInCategories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
          {filteredTemplates.map((t) => (
            <Card key={t.key} className="p-3 flex items-start gap-2 hover:bg-muted/30 transition-colors">
              <span className="text-xl shrink-0">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight truncate">{t.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{t.description}</p>
                <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{t.key} · {t.canvasWidth}×{t.canvasHeight}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Community Shared Templates
          {sharedLoading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />}
        </h2>
        {shared.length === 0 && !sharedLoading && (
          <p className="text-sm text-muted-foreground italic">No shared templates yet.</p>
        )}
        <div className="space-y-2">
          {shared.map((t) => (
            <Card key={t.id} className="p-3 flex items-center gap-3">
              <span className="text-xl shrink-0">{t.emoji || "🎬"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{t.name}</p>
                  {t.featured && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">⭐ Featured</Badge>}
                  {t.approved
                    ? <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-500/50 text-green-400">Approved</Badge>
                    : <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-yellow-500/50 text-yellow-400">Pending</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
                <p className="text-[9px] text-muted-foreground/60">by {t.authorEmail} · {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost" size="icon" className="w-7 h-7"
                  title={t.featured ? "Unfeature" : "Feature"}
                  disabled={actionPending === t.id}
                  onClick={() => handleFeature(t.id, !t.featured)}
                >
                  {t.featured ? <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> : <StarOff className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="ghost" size="icon" className="w-7 h-7"
                  title={t.approved ? "Revoke approval" : "Approve"}
                  disabled={actionPending === t.id}
                  onClick={() => handleApprove(t.id, !t.approved)}
                >
                  {t.approved ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                </Button>
                <Button
                  variant="ghost" size="icon" className="w-7 h-7 text-red-400 hover:text-red-300"
                  title="Delete"
                  disabled={actionPending === t.id}
                  onClick={() => handleDelete(t.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
