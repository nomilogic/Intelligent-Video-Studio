import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreVertical, Plus, Film, FolderOpen, Pencil, Copy, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AccountDropdown } from "@/components/AccountDropdown";
import { DiamondPill } from "@/components/DiamondPill";
import { AuthModal } from "@/components/AuthModal";

interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  thumbnail: string | null;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
  updatedAt: string;
}

export function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await apiFetch<ProjectRow[]>("/projects");
      setProjects(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) setAuthOpen(true);
    if (user) refresh();
  }, [user, authLoading]);

  const create = async () => {
    setCreating(true);
    try {
      const p = await apiFetch<ProjectRow>("/projects", {
        method: "POST",
        body: { name: "Untitled Project" },
      });
      setLocation(`/editor/${p.id}`);
    } catch (err: any) {
      toast({ title: "Could not create project", description: err.message, variant: "destructive" });
      setCreating(false);
    }
  };

  const duplicate = async (id: number) => {
    try {
      await apiFetch(`/projects/${id}/duplicate`, { method: "POST" });
      toast({ title: "Project duplicated" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Could not duplicate", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      toast({ title: "Project deleted" });
      setDeletingId(null);
      await refresh();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const rename = async (id: number) => {
    if (!renameValue.trim()) return;
    try {
      await apiFetch(`/projects/${id}`, { method: "PUT", body: { name: renameValue.trim() } });
      setRenamingId(null);
      await refresh();
    } catch (err: any) {
      toast({ title: "Rename failed", description: err.message, variant: "destructive" });
    }
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

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">My projects</h1>
          <Button onClick={create} disabled={creating || !user} data-testid="button-new-project">
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            New project
          </Button>
        </div>

        {loading || authLoading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">
            <Loader2 className="inline w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : !user ? (
          <Card className="p-10 text-center space-y-3">
            <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Sign in to manage your saved projects.</div>
            <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">No projects yet — create your first one.</div>
            <Button onClick={create}><Plus className="w-4 h-4 mr-2" /> New project</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="overflow-hidden cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setLocation(`/editor/${p.id}`)}
                data-testid={`project-card-${p.id}`}
              >
                <div
                  className="aspect-video bg-muted flex items-center justify-center bg-cover bg-center"
                  style={p.thumbnail ? { backgroundImage: `url(${p.thumbnail})` } : undefined}
                >
                  {!p.thumbnail && <Film className="w-8 h-8 text-muted-foreground" />}
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    {renamingId === p.id ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") rename(p.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => rename(p.id)}
                        className="h-7 text-sm"
                        data-testid={`input-rename-${p.id}`}
                      />
                    ) : (
                      <div className="text-sm font-medium truncate flex-1" title={p.name}>{p.name}</div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="w-7 h-7 -mr-1" data-testid={`menu-project-${p.id}`}>
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(p.id)}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingId(p.id)} className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {p.canvasWidth}×{p.canvasHeight} · {p.duration.toFixed(1)}s · {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={deletingId !== null} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the project and its timeline data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && remove(deletingId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="confirm-delete-project"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
