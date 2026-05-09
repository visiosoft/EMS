import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { getActiveAccount } from "./auth/entra.ts";

/**
 * Global cache policy for the EMS app:
 *  - `staleTime` (30 min): list queries (companies/tours/attractions/engagements)
 *    do NOT refetch on mount, focus, or reconnect within this window.
 *  - `gcTime` (60 min): keep unused queries around long enough to survive
 *    route switches without re-fetching.
 *  - `refetchOn*` flags are all off — mutations surgically patch the cache,
 *    so we don't want the network to silently bust what we just wrote.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const location = useLocation();
  const account = getActiveAccount() ?? accounts[0] ?? null;

  if (!isAuthenticated && !account) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }

  return children;
}

const App = () => (
  <ThemeProvider
    attribute="data-theme"
    defaultTheme="light"
    themes={["light", "dark"]}
    disableTransitionOnChange={false}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;