import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDiamonds } from "@/lib/diamonds-context";

export function LoginRequiredModal({ onSignIn }: { onSignIn: () => void }) {
  const { loginRequired, closeLoginRequired } = useDiamonds();
  const open = !!loginRequired;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeLoginRequired()}>
      <DialogContent className="sm:max-w-[420px]" data-testid="login-required-modal">
        <DialogHeader>
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>
            This feature requires a free account. You'll get a welcome bonus of diamonds when you sign up.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={closeLoginRequired} data-testid="button-close-loginreq">
            Cancel
          </Button>
          <Button
            onClick={() => {
              closeLoginRequired();
              onSignIn();
            }}
            data-testid="button-open-signin"
          >
            Sign in / Sign up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
