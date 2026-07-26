import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import Applications from "@/pages/applications";
import AiTailor from "@/pages/ai-tailor";
import ResumeAnalyzer from "@/pages/resume-analyzer";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import { useGetApplications, getGetApplicationsQueryKey } from "@workspace/api-client-react";
import { useInterviewNotifications } from "@/hooks/useInterviewNotifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function InterviewWatcher() {
  const { data: applications } = useGetApplications(
    { status: "interviewing" },
    { query: { refetchInterval: 60_000, queryKey: getGetApplicationsQueryKey({ status: "interviewing" }) } }
  );
  useInterviewNotifications(applications);
  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/jobs" component={Jobs} />
        <Route path="/applications" component={Applications} />
        <Route path="/ai" component={AiTailor} />
        <Route path="/resume-analyzer" component={ResumeAnalyzer} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <InterviewWatcher />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
