import {
    EventType,
    InteractionStatus,
    type AccountInfo,
    type AuthenticationResult,
    type Configuration,
    PublicClientApplication,
} from "@azure/msal-browser";

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE?.trim();
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
        cacheLocation: "sessionStorage",
    },
};

export const loginRequest = {
    scopes: apiScope
        ? ["openid", "profile", "email", "User.Read", apiScope]
        : ["openid", "profile", "email", "User.Read"],
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

export function getAccountInitials(account: AccountInfo | null | undefined): string {
    const name = getAccountName(account);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "EU";
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function isMsalBusy(status: InteractionStatus): boolean {
    return status !== InteractionStatus.None;
}