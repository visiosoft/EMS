import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppChooser from "./pages/AppChooser.tsx";
import InternalApp from "./pages/InternalApp.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { getActiveAccount, isMsalBusy } from "./auth/entra.ts";
import { isEmsEnabled, isInternalEnabled } from "./routing/appSuite.ts";
import { APP_CHOOSER_PATH, EMS_ROOT, INTERNAL_ROOT, LOGIN_PATH } from "./routing/paths.ts";

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
  const { accounts, inProgress } = useMsal();
  const location = useLocation();
  const account = getActiveAccount() ?? accounts[0] ?? null;

  if (isMsalBusy(inProgress)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-text-muted">
        Checking sign-in…
      </div>
    );
  }

  if (!isAuthenticated && !account) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
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
              <Route path={LOGIN_PATH} element={<Login />} />

              {isEmsEnabled() && isInternalEnabled() ? (
                <Route
                  path={APP_CHOOSER_PATH}
                  element={
                    <ProtectedRoute>
                      <AppChooser />
                    </ProtectedRoute>
                  }
                />
              ) : null}

              {isInternalEnabled() ? (
                <Route
                  path={`${INTERNAL_ROOT}/*`}
                  element={
                    <ProtectedRoute>
                      <InternalApp />
                    </ProtectedRoute>
                  }
                />
              ) : null}

              {isEmsEnabled() ? (
                <Route
                  path={EMS_ROOT}
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
              ) : (
                <Route path={EMS_ROOT} element={<Navigate to={INTERNAL_ROOT} replace />} />
              )}

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
