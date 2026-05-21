import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Building2, LogOut } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAccountEmail,
  getAccountName,
  getActiveAccount,
  isMsalBusy,
} from "@/auth/entra";
import { IaeLogoFull } from "@/components/ems/Layout";
import { IaeBrandMark } from "@/components/brand/IaeBrandMark";
import { APP_CHOOSER_PATH, EMS_ROOT, INTERNAL_HOME_PATH, LOGIN_PATH } from "@/routing/paths";
import { rememberWorkspacePath } from "@/routing/workspacePreference";

const AppChooser = () => {
  const isAuthenticated = useIsAuthenticated();
  const { accounts, inProgress, instance } = useMsal();
  const account = getActiveAccount() ?? accounts[0] ?? null;
  const displayName = getAccountName(account);
  const email = getAccountEmail(account);
  if (!isAuthenticated && !account) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: APP_CHOOSER_PATH }} />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(3,201,169,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%)]"
          aria-hidden
        />

        <Card className="relative z-10 w-full max-w-3xl border-border/80 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <IaeLogoFull height={34} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void instance.logoutRedirect()}
                disabled={isMsalBusy(inProgress)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl">Choose your workspace</CardTitle>
              <CardDescription className="mt-2 max-w-xl text-sm leading-6">
                Signed in as {displayName}
                {email ? ` (${email})` : ""}. Open Event Management for operations data, or the Company Hub for
                employee resources and intranet content.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to={EMS_ROOT}
                onClick={() => rememberWorkspacePath(EMS_ROOT)}
                className="group flex flex-col rounded-xl border border-border bg-background/60 p-6 transition hover:border-emerald-500/40 hover:bg-emerald-500/5"
              >
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <Building2 className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-lg font-semibold text-foreground">Event Management (EMS)</span>
                <span className="mt-2 text-sm text-muted-foreground">
                  Projects, engagements, daily sales, venues, and operational reporting.
                </span>
              </Link>

              <Link
                to={INTERNAL_HOME_PATH}
                onClick={() => rememberWorkspacePath(INTERNAL_HOME_PATH)}
                className="group flex flex-col rounded-xl border border-border bg-background/60 p-6 transition hover:border-neutral-600/30 hover:bg-neutral-500/5"
              >
                <span className="mb-4 inline-flex items-center justify-center rounded-lg bg-black px-3 py-2">
                  <IaeBrandMark surface="on-dark" />
                </span>
                <span className="text-lg font-semibold text-foreground">iAE Company Hub</span>
                <span className="mt-2 text-sm text-muted-foreground">
                  Your hub for employee services, quick links, engagements, and company news.
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppChooser;
