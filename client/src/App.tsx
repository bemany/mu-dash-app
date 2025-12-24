import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import UploadPage from "@/pages/upload";
import AdminPage from "@/pages/admin";
import HelpPage from "@/pages/help";
import UpdatesPage from "@/pages/updates";
import PerformancePage from "@/pages/performance";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PerformancePage} />
      <Route path="/performance" component={PerformancePage} />
      <Route path="/import" component={UploadPage} />
      <Route path="/v/:vorgangsId" component={PerformancePage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/updates" component={UpdatesPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
