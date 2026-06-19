import {
    EventType,
    InteractionStatus,
    InteractionRequiredAuthError,
    type AccountInfo,
    type AuthenticationResult,
    type Configuration,
    PublicClientApplication,
} from "@azure/msal-browser";

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE?.trim();
const graphScopeConfig =
    import.meta.env.VITE_ENTRA_GRAPH_SCOPE?.trim() ||
    "https://graph.microsoft.com/User.Read.All";
const graphScopes = graphScopeConfig
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
const microsoftGraphAudiences = new Set([
    "00000003-0000-0000-c000-000000000000",
    "https://graph.microsoft.com",
]);
const redirectUriOverride = import.meta.env.VITE_ENTRA_REDIRECT_URI;
const redirectPath = import.meta.env.VITE_ENTRA_REDIRECT_PATH ?? "/login";

export const isEntraConfigured = Boolean(clientId && tenantId);
export const entraConfigMessage = !clientId || !tenantId
    ? "Set VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID to enable Microsoft Entra sign-in."
    : null;

const msalConfig: Configuration = {
    auth: {
        clientId: clientId ?? "00000000-0000-0000-0000-000000000000",
        authority: `https://login.microsoftonline.com/${tenantId ?? "common"}`,
        redirectUri: resolveRedirectUri(),
        postLogoutRedirectUri: resolveRedirectUri(),
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
    } as any,
};

export const loginRequest = {
    scopes: Array.from(new Set(["openid", "profile", "email", "User.Read", ...graphScopes])),
};

export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.addEventCallback((event) => {
    if (
        (event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) &&
        event.payload
    ) {
        const authResult = event.payload as AuthenticationResult;
        if (authResult.account) {
            msalInstance.setActiveAccount(authResult.account);
        }
    }
});

export async function initializeMsal() {
    await msalInstance.initialize();

    const redirectResult = await msalInstance.handleRedirectPromise();
    if (redirectResult?.account) {
        msalInstance.setActiveAccount(redirectResult.account);
        return;
    }

    const activeAccount = msalInstance.getActiveAccount();
    if (!activeAccount) {
        const [firstAccount] = msalInstance.getAllAccounts();
        if (firstAccount) {
            msalInstance.setActiveAccount(firstAccount);
        }
    }
}

export function getActiveAccount(): AccountInfo | null {
    return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
}

function resolveRedirectUri(): string {
    if (redirectUriOverride && redirectUriOverride.trim().length > 0) {
        return redirectUriOverride.trim();
    }

    if (typeof window !== "undefined" && window.location.origin) {
        return new URL(redirectPath, window.location.origin).toString();
    }

    return redirectPath;
}

function readClaim(account: AccountInfo | null | undefined, claim: string): string | null {
    const claims = account?.idTokenClaims;
    if (!claims || typeof claims !== "object") return null;
    const value = (claims as Record<string, unknown>)[claim];
    if (typeof value === "string" && value.trim().length > 0) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return null;
}

export function getAccountName(account: AccountInfo | null | undefined): string {
    return account?.name ?? readClaim(account, "name") ?? getAccountEmail(account) ?? "Entra user";
}

export function getAccountEmail(account: AccountInfo | null | undefined): string {
    return readClaim(account, "preferred_username") ?? readClaim(account, "email") ?? account?.username ?? "";
}

export function getAccountOid(account: AccountInfo | null | undefined): string {
    return readClaim(account, "oid") ?? account?.localAccountId ?? "";
}

export async function acquireApiAccessToken(account: AccountInfo): Promise<string> {
    if (!apiScope) {
        throw new Error('Set VITE_ENTRA_API_SCOPE to request an access token for the backend admin users API.');
    }

    const response = await msalInstance.acquireTokenSilent({
        account,
        scopes: [apiScope],
    });
    return response.accessToken;
}

type GraphAccessTokenOptions = {
    forceRefresh?: boolean;
};

export type GraphTokenDiagnostics = {
    aud: string;
    tid: string;
    scp: string;
    roles: string[];
    hasUserReadAll: boolean;
    hasUserReadWriteAll: boolean;
    isGraphAudience: boolean;
};

export async function acquireGraphAccessToken(
    account: AccountInfo,
    options: GraphAccessTokenOptions = {},
): Promise<string> {
    const response = await msalInstance.acquireTokenSilent({
        account,
        scopes: graphScopes,
        forceRefresh: options.forceRefresh,
    });
    logGraphTokenDiagnostics(response.accessToken);
    return response.accessToken;
}

export async function requestGraphAccessToken(
    account: AccountInfo,
    options: GraphAccessTokenOptions = {},
): Promise<string> {
    const request = {
        account,
        scopes: graphScopes,
        loginHint: account.username,
        forceRefresh: options.forceRefresh,
    };

    try {
        const response = await msalInstance.acquireTokenSilent(request);
        logGraphTokenDiagnostics(response.accessToken);
        return response.accessToken;
    } catch (error) {
        if (!requiresInteractiveGraphConsent(error)) throw error;
    }

    const response = await msalInstance.acquireTokenPopup(request);
    logGraphTokenDiagnostics(response.accessToken);
    return response.accessToken;
}

export function describeGraphAccessToken(accessToken: string): GraphTokenDiagnostics {
    const claims = decodeJwtPayload(accessToken);
    const scopes = typeof claims?.scp === "string" ? claims.scp.split(/\s+/).filter(Boolean) : [];
    const roles = Array.isArray(claims?.roles)
        ? claims.roles.filter((role): role is string => typeof role === "string")
        : [];
    const audience = typeof claims?.aud === "string" ? claims.aud : "";
    const tenant = typeof claims?.tid === "string" ? claims.tid : "";
    return {
        aud: audience,
        tid: tenant,
        scp: scopes.join(" "),
        roles,
        hasUserReadAll: scopes.includes("User.Read.All") || scopes.includes("User.ReadWrite.All"),
        hasUserReadWriteAll: scopes.includes("User.ReadWrite.All"),
        isGraphAudience: microsoftGraphAudiences.has(audience),
    };
}

function logGraphTokenDiagnostics(accessToken: string): void {
    const diagnostics = describeGraphAccessToken(accessToken);

    if (!diagnostics.isGraphAudience || !diagnostics.hasUserReadAll) {
        console.warn("[MSAL] Microsoft Graph token is missing the expected audience or delegated scope.", {
            expectedAudience: "Microsoft Graph",
            expectedScope: "User.Read.All or User.ReadWrite.All",
            aud: diagnostics.aud,
            scp: diagnostics.scp,
            roles: diagnostics.roles,
        });
    }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const [, payload] = token.split(".");
        if (!payload) return null;
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        return JSON.parse(atob(padded)) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function requiresInteractiveGraphConsent(error: unknown): boolean {
    if (error instanceof InteractionRequiredAuthError) return true;
    if (!(error instanceof Error)) return false;

    return /interaction_required|consent_required|login_required|no_account|invalid_grant/i.test(
        error.message,
    );
}

export function isApiAccessTokenConfigured(): boolean {
    return Boolean(apiScope);
}

export function getAccountInitials(account: AccountInfo | null | undefined): string {
    const name = getAccountName(account);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "EU";
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function isMsalBusy(status: InteractionStatus): boolean {
    return status !== InteractionStatus.None;
}
