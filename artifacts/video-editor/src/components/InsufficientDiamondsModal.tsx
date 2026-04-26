import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gem } from "lucide-react";
import { useDiamonds } from "@/lib/diamonds-context";
import { useLocation } from "wouter";

export function InsufficientDiamondsModal() {
  const { insufficient, closeInsufficient } = useDiamonds();
  const [, setLocation] = useLocation();
  const open = !!insufficient;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeInsufficient()}>
      <DialogContent className="sm:max-w-[420px]" data-testid="insufficient-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-cyan-400" /> Need more diamonds
          </DialogTitle>
          <DialogDescription>
            <span className="block pt-1">
              {insufficient?.featureLabel ?? "This feature"} costs{" "}
              <span className="font-medium text-foreground">{insufficient?.required}</span> diamonds.
              You have <span className="font-medium text-foreground">{insufficient?.balance}</span>.
            </span>
            <span className="block pt-2 text-xs">
              Earn free diamonds with the daily login bonus and referrals, or purchase a pack.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={closeInsufficient} data-testid="button-close-insufficient">
            Cancel
          </Button>
          <Button
            onClick={() => {
              closeInsufficient();
              setLocation("/diamonds");
            }}
            data-testid="button-go-shop"
          >
            Get diamonds
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
