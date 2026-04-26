import { Button } from "@/components/ui/button";
import { Gem } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDiamonds } from "@/lib/diamonds-context";
import { useLocation } from "wouter";

export function DiamondPill({ onSignInRequired }: { onSignInRequired: () => void }) {
  const { user } = useAuth();
  const { data } = useDiamonds();
  const [, setLocation] = useLocation();

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1 px-2"
        onClick={onSignInRequired}
        data-testid="diamond-pill-signin"
      >
        <Gem className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-xs">Earn diamonds</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1 px-2"
      onClick={() => setLocation("/diamonds")}
      data-testid="diamond-pill"
    >
      <Gem className="h-3.5 w-3.5 text-cyan-400" />
      <span className="text-xs tabular-nums font-medium">
        {data?.balance ?? "—"}
      </span>
    </Button>
  );
}
