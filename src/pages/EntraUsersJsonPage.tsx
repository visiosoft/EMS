import { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { apiFetch } from "@/api/config";
import { getActiveAccount, requestGraphAccessToken } from "@/auth/entra";

type LoadState =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: unknown; error?: undefined }
  | { status: "error"; data?: undefined; error: string };

export default function EntraUsersJsonPage() {
  const { accounts } = useMsal();
  const account = useMemo(
    () => getActiveAccount() ?? accounts[0] ?? null,
    [accounts],
  );
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      if (!account) {
        setState({
          status: "error",
          error: "Sign in with Microsoft Entra ID to load this export.",
        });
        return;
      }

      setState({ status: "loading" });
      try {
        const graphAccessToken = await requestGraphAccessToken(account, {
          forceRefresh: true,
        });
        const data = await apiFetch<unknown>("/admin/users/entra-raw", {
          headers: {
            "x-entra-graph-access-token": graphAccessToken,
          },
        });
        if (!cancelled) setState({ status: "ready", data });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Could not load Entra users.",
          });
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [account]);

  const body =
    state.status === "ready"
      ? JSON.stringify(state.data, null, 2)
      : state.status === "error"
        ? JSON.stringify({ error: state.error }, null, 2)
        : JSON.stringify({ status: "loading" }, null, 2);

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-neutral-100">
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
        {body}
      </pre>
    </main>
  );
}
