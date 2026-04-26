import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { LogOut, ShieldCheck, FolderKanban, Gem, User2 } from "lucide-react";

export function AccountDropdown({ onSignIn }: { onSignIn: () => void }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    return (
      <Button variant="default" size="sm" onClick={onSignIn} data-testid="button-signin">
        Sign in
      </Button>
    );
  }

  const initials = (user.name || user.email)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-1" data-testid="button-account">
          <Avatar className="h-7 w-7">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
            <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-medium truncate">{user.name ?? user.email}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation("/projects")} data-testid="menu-projects">
          <FolderKanban className="mr-2 h-4 w-4" /> My projects
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation("/diamonds")} data-testid="menu-diamonds">
          <Gem className="mr-2 h-4 w-4" /> Diamonds & shop
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation("/account")} data-testid="menu-account">
          <User2 className="mr-2 h-4 w-4" /> Account
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem onClick={() => setLocation("/admin")} data-testid="menu-admin">
            <ShieldCheck className="mr-2 h-4 w-4" /> Admin panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await logout();
            setLocation("/");
          }}
          data-testid="menu-logout"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
