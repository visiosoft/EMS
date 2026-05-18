import { useEffect } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { ShieldCheck, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    entraConfigMessage,
    getAccountEmail,
    getAccountName,
    getActiveAccount,
    isEntraConfigured,
    isMsalBusy,
    loginRequest,
} from "@/auth/entra";
import { IaeLogoFull } from "@/components/ems/Layout";
import { resolvePostLoginPath } from "@/routing/postLogin";

type LocationState = {
    from?: string;
};

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useIsAuthenticated();
    const { accounts, inProgress, instance } = useMsal();
    const account = getActiveAccount() ?? accounts[0] ?? null;
    const displayName = getAccountName(account);
    const email = getAccountEmail(account);
    const targetPath = resolvePostLoginPath((location.state as LocationState | null)?.from);

    useEffect(() => {
        if (isAuthenticated && account) {
            navigate(targetPath, { replace: true });
        }
    }, [account, isAuthenticated, navigate, targetPath]);

    return (
        <div className="min-h-screen overflow-hidden bg-background text-foreground">
            <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(3,201,169,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(180deg,_transparent,_rgba(0,0,0,0.18))]" />
                <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="absolute bottom-[-7rem] right-[-4rem] h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

                <Card className="relative z-10 w-full max-w-xl border-border/80 bg-card/95 backdrop-blur">
                    <CardHeader className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <IaeLogoFull height={34} />
                            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                                Entra Test Login
                            </div>
                        </div>
                        <div>
                            <CardTitle className="text-3xl">Sign in with Microsoft Entra ID</CardTitle>
                            <CardDescription className="mt-2 max-w-lg text-sm leading-6">
                                Use your Entra account to sign in. After authentication you can open Event Management (EMS) or the iAE Company Hub.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border bg-background/60 p-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                    Auth mode
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Browser-based sign-in using your Entra application registration.
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/60 p-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                                    <UserRound className="h-4 w-4 text-sky-400" />
                                    Identity preview
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {account ? `${displayName}${email ? ` • ${email}` : ""}` : "No active Entra session yet."}
                                </p>
                            </div>
                        </div>

                        {entraConfigMessage && (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                                {entraConfigMessage}
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">
                            Client secret is intentionally not used in this page. SPA sign-in should stay on the public-client flow.
                        </div>
                        <div className="flex gap-3">
                            {account && isAuthenticated ? (
                                <Button variant="outline" onClick={() => void instance.logoutRedirect()}>
                                    Sign out
                                </Button>
                            ) : null}
                            <Button
                                onClick={() => void instance.loginRedirect(loginRequest)}
                                disabled={!isEntraConfigured || isMsalBusy(inProgress)}
                            >
                                {isMsalBusy(inProgress) ? "Working..." : "Sign in with Entra"}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default Login;