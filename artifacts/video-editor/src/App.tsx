import { useState } from "react";
import { Switch, Route, Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { DiamondsProvider } from "@/lib/diamonds-context";
import { Editor } from "@/components/Editor";
import { HomePage } from "@/pages/HomePage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { DiamondsPage } from "@/pages/DiamondsPage";
import { AccountPage } from "@/pages/AccountPage";
import { EditorPage } from "@/pages/EditorPage";
import { AdminLayout } from "@/pages/AdminLayout";
import { VerifyPage, ResetPasswordPage, OAuthCallbackPage } from "@/pages/VerifyResetPages";
import { AuthModal } from "@/components/AuthModal";
import { InsufficientDiamondsModal } from "@/components/InsufficientDiamondsModal";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/diamonds" component={DiamondsPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/editor/:id">
        {(params) => <EditorPage projectId={params.id} />}
      </Route>
      <Route path="/editor">
        {() => <Editor />}
      </Route>
      <Route path="/verify" component={VerifyPage} />
      <Route path="/reset" component={ResetPasswordPage} />
      <Route path="/oauth/callback" component={OAuthCallbackPage} />
      <Route path="/admin/:rest*" component={AdminLayout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalModals() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <>
      <InsufficientDiamondsModal />
      <LoginRequiredModal onSignIn={() => setAuthOpen(true)} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}

function App() {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DiamondsProvider>
            <Router base={base || undefined}>
              <AppRoutes />
              <GlobalModals />
            </Router>
            <Toaster />
          </DiamondsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
