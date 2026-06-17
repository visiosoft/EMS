export interface AdminDirectoryUserRow {
    id: string;
    name: string;
    email: string;
    role: string;
    lastLogin: string;
    status: 'Active';
}

type GraphUser = {
    id: string;
    displayName?: string | null;
    userPrincipalName?: string | null;
    mail?: string | null;
    givenName?: string | null;
    surname?: string | null;
};

type GraphUsersResponse = {
    value?: GraphUser[];
    '@odata.nextLink'?: string;
};

export type GraphRequestErrorDetail = {
    code: string;
    message: string;
    requestId: string;
    clientRequestId: string;
    raw: string;
};

export type GraphRequestError = Error & {
    status?: number;
    detail?: string;
    graph?: GraphRequestErrorDetail;
};

const GRAPH_USERS_URL =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,givenName,surname&$top=999';

export async function fetchAdminUsers(graphAccessToken: string): Promise<AdminDirectoryUserRow[]> {
    const users = await fetchEntraUsers(graphAccessToken);
    const rows = users.map(mapGraphUserToRow).sort((left, right) => left.name.localeCompare(right.name));
    console.debug(`[Microsoft Graph] Users returned from Graph: ${rows.length}`);
    return rows;
}

async function fetchEntraUsers(graphAccessToken: string): Promise<GraphUser[]> {
    const users: GraphUser[] = [];
    let url: string | null = GRAPH_USERS_URL;

    while (url) {
        const clientRequestId = makeClientRequestId();
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${graphAccessToken}`,
                Accept: 'application/json',
                'client-request-id': clientRequestId,
                'return-client-request-id': 'true',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[Microsoft Graph] Users request failed: ${response.status} ${text}`);
            const graph = parseGraphErrorDetail(text, clientRequestId);
            const message =
                response.status === 403
                    ? 'Unable to read Microsoft Entra users. Please confirm delegated Microsoft Graph permission User.ReadBasic.All is granted with admin consent.'
                    : `Microsoft Graph users request failed: ${response.status}`;
            const error = new Error(message) as GraphRequestError;
            error.status = response.status;
            error.detail = text;
            error.graph = graph;
            throw error;
        }

        const json = (await response.json()) as GraphUsersResponse;
        users.push(...(json.value || []));
        url = json['@odata.nextLink'] || null;
    }

    return users;
}

export function getGraphRequestErrorDetail(error: unknown): GraphRequestErrorDetail | null {
    if (
        typeof error === 'object' &&
        error !== null &&
        'graph' in error &&
        typeof (error as { graph?: unknown }).graph === 'object' &&
        (error as { graph?: unknown }).graph !== null
    ) {
        return (error as { graph: GraphRequestErrorDetail }).graph;
    }
    return null;
}

function parseGraphErrorDetail(raw: string, fallbackClientRequestId: string): GraphRequestErrorDetail {
    try {
        const parsed = JSON.parse(raw) as {
            error?: {
                code?: string;
                message?: string;
                innerError?: {
                    'request-id'?: string;
                    requestId?: string;
                    'client-request-id'?: string;
                    clientRequestId?: string;
                };
            };
        };
        const inner = parsed.error?.innerError;
        return {
            code: String(parsed.error?.code ?? '').trim(),
            message: String(parsed.error?.message ?? '').trim(),
            requestId: String(inner?.['request-id'] ?? inner?.requestId ?? '').trim(),
            clientRequestId: String(
                inner?.['client-request-id'] ?? inner?.clientRequestId ?? fallbackClientRequestId,
            ).trim(),
            raw,
        };
    } catch {
        return {
            code: '',
            message: raw.trim(),
            requestId: '',
            clientRequestId: fallbackClientRequestId,
            raw,
        };
    }
}

function makeClientRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapGraphUserToRow(user: GraphUser): AdminDirectoryUserRow {
    const fallbackName = `${user.givenName || ''} ${user.surname || ''}`.trim();
    return {
        id: user.id,
        name: user.displayName || fallbackName || user.userPrincipalName || 'Entra user',
        email: user.mail || user.userPrincipalName || '',
        role: 'Entra user',
        lastLogin: '—',
        status: 'Active',
    };
}
