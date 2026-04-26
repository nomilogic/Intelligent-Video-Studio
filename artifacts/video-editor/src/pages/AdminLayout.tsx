import { Link, useLocation, Route, Switch } from "wouter";
import { Film, LayoutDashboard, Users, FolderKanban, Gem, ToggleLeft, BarChart3, FileClock, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { AccountDropdown } from "@/components/AccountDropdown";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminProjects } from "./admin/AdminProjects";
import { AdminDiamonds } from "./admin/AdminDiamonds";
import { AdminFeatures } from "./admin/AdminFeatures";
import { AdminAnalytics } from "./admin/AdminAnalytics";
import { AdminAudit } from "./admin/AdminAudit";

const NAV: { href: string; label: string; Icon: typeof LayoutDashboard }[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/projects", label: "Projects", Icon: FolderKanban },
  { href: "/admin/diamonds", label: "Diamonds & shop", Icon: Gem },
  { href: "/admin/features", label: "Feature flags", Icon: ToggleLeft },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/admin/audit", label: "Audit log", Icon: FileClock },
];

export function AdminLayout() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) setLocation("/");
  }, [user, loading, setLocation]);

  if (loading || !user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="h-14 border-b border-border flex items-center px-6 gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">VideoAI</span>
        </Link>
        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">Admin</span>
        <div className="flex-1" />
        <Link href="/projects"><Button variant="outline" size="sm">Back to app</Button></Link>
        <AccountDropdown onSignIn={() => {}} />
      </header>
      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-56 border-r border-border bg-card/30 p-3 flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = location === href || (href !== "/admin" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <a
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                  data-testid={`admin-nav-${href.replace(/\//g, "-")}`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </a>
              </Link>
            );
          })}
          <div className="flex-1" />
          <Link href="/account"><a className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50">
            <Settings className="w-4 h-4" /> My account
          </a></Link>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">
          <Switch>
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/projects" component={AdminProjects} />
            <Route path="/admin/diamonds" component={AdminDiamonds} />
            <Route path="/admin/features" component={AdminFeatures} />
            <Route path="/admin/analytics" component={AdminAnalytics} />
            <Route path="/admin/audit" component={AdminAudit} />
          </Switch>
        </main>
      </div>
    </div>
  );
}
