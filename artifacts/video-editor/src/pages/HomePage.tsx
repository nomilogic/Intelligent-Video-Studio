import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Film, Gem, Cloud, Sparkles, Plus, FolderOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AccountDropdown } from "@/components/AccountDropdown";
import { DiamondPill } from "@/components/DiamondPill";
import { AuthModal } from "@/components/AuthModal";
import { apiFetch } from "@/lib/api-client";

export function HomePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setCreating(true);
    try {
      const project = await apiFetch<{ id: number }>("/projects", {
        method: "POST",
        body: { name: "Untitled Project" },
      });
      setLocation(`/editor/${project.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="h-14 border-b border-border flex items-center px-6 gap-3">
        <Film className="w-5 h-5 text-primary" />
        <span className="font-bold tracking-tight">VideoAI</span>
        <div className="flex-1" />
        <DiamondPill onSignInRequired={() => setAuthOpen(true)} />
        <AccountDropdown onSignIn={() => setAuthOpen(true)} />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        <section className="text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            AI Video Editor for everyone
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cut, grade, animate, subtitle, and export — powered by AI. Try it free, no account required.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={() => setLocation("/editor/anonymous")} data-testid="button-try-now">
              Try editor now
            </Button>
            <Button size="lg" variant="outline" onClick={handleCreateProject} disabled={creating} data-testid="button-create-account-project">
              <Plus className="w-4 h-4 mr-1" />
              {user ? "New saved project" : "Sign up & save"}
            </Button>
            {user && (
              <Link href="/projects">
                <Button size="lg" variant="ghost" data-testid="button-my-projects">
                  <FolderOpen className="w-4 h-4 mr-1" /> My projects
                </Button>
              </Link>
            )}
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          <Card className="p-5 space-y-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="font-semibold">AI in the timeline</div>
            <p className="text-sm text-muted-foreground">
              Type a sentence and let Gemini build cuts, transitions, animations, captions and color grades.
            </p>
          </Card>
          <Card className="p-5 space-y-2">
            <Gem className="w-5 h-5 text-cyan-400" />
            <div className="font-semibold">Diamond credits</div>
            <p className="text-sm text-muted-foreground">
              Earn free diamonds daily, with referrals, or buy a pack. Spend them on premium AI actions.
            </p>
          </Card>
          <Card className="p-5 space-y-2">
            <Cloud className="w-5 h-5 text-primary" />
            <div className="font-semibold">Bring your own cloud</div>
            <p className="text-sm text-muted-foreground">
              Connect Google Drive, Dropbox, or OneDrive — import media and save exports straight back.
            </p>
          </Card>
        </section>
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
