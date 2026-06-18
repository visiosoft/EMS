export interface AdminDirectoryUserRow {
    id: string;
    name: string;
    email: string;
    role: string;
    jobTitle: string;
    department: string;
    employeeType: string;
    officeLocation: string;
    city: string;
    mobilePhone: string;
    businessPhones: string[];
    companyName: string;
    accountEnabled: boolean;
    userType: string;
    lastLogin: string;
    status: 'Active' | 'Disabled';
}

type GraphUser = {
    id: string;
    displayName?: string | null;
    userPrincipalName?: string | null;
    mail?: string | null;
    givenName?: string | null;
    surname?: string | null;
    department?: string | null;
    jobTitle?: string | null;
    employeeType?: string | null;
    officeLocation?: string | null;
    city?: string | null;
    mobilePhone?: string | null;
    businessPhones?: string[] | null;
    companyName?: string | null;
    accountEnabled?: boolean | null;
    userType?: string | null;
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
};

export type GraphRequestError = Error & {
    status?: number;
    detail?: string;
    graph?: GraphRequestErrorDetail;
};

const GRAPH_USERS_URL =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,employeeType,mobilePhone,businessPhones,officeLocation,city,state,country,companyName,accountEnabled,userType&$top=999';

export async function fetchAdminUsers(graphAccessToken: string): Promise<AdminDirectoryUserRow[]> {
    const users = await fetchEntraUsers(graphAccessToken);
    return users.map(mapGraphUserToRow).sort((left, right) => left.name.localeCompare(right.name));
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
            const graph = parseGraphErrorDetail(text, clientRequestId);
            console.error(`[Microsoft Graph] Users request failed: ${formatGraphErrorForLog(response.status, graph)}`);
            const message =
                response.status === 403
                    ? 'Unable to read Microsoft Entra users. Please confirm delegated Microsoft Graph permission User.Read.All is granted with admin consent.'
                    : `Microsoft Graph users request failed: ${response.status}`;
            const error = new Error(message) as GraphRequestError;
            error.status = response.status;
            error.detail = formatGraphErrorForClient(graph);
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
        };
    } catch {
        return {
            code: '',
            message: '',
            requestId: '',
            clientRequestId: fallbackClientRequestId,
        };
    }
}

function formatGraphErrorForLog(status: number, graph: GraphRequestErrorDetail): string {
    const fields = [`status=${status}`];
    if (graph.code) fields.push(`code=${safeLogValue(graph.code)}`);
    if (graph.requestId) fields.push(`requestId=${safeLogValue(graph.requestId)}`);
    if (graph.clientRequestId) fields.push(`clientRequestId=${safeLogValue(graph.clientRequestId)}`);
    return fields.join(' ');
}

function formatGraphErrorForClient(graph: GraphRequestErrorDetail): string {
    const fields: string[] = [];
    if (graph.code) fields.push(`code ${graph.code}`);
    if (graph.requestId) fields.push(`request ID ${graph.requestId}`);
    return fields.length ? `Graph diagnostics: ${fields.join(', ')}.` : '';
}

function safeLogValue(value: string): string {
    return value.replace(/[^\w:.-]/g, '_').slice(0, 120);
}

function makeClientRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapGraphUserToRow(user: GraphUser): AdminDirectoryUserRow {
    const fallbackName = `${user.givenName || ''} ${user.surname || ''}`.trim();
    const accountEnabled = user.accountEnabled !== false;
    return {
        id: user.id,
        name: cleanString(user.displayName) || fallbackName || cleanString(user.userPrincipalName) || 'Entra user',
        email: cleanString(user.mail) || cleanString(user.userPrincipalName),
        role: 'Entra user',
        jobTitle: cleanString(user.jobTitle),
        department: cleanString(user.department),
        employeeType: cleanString(user.employeeType),
        officeLocation: cleanString(user.officeLocation),
        city: cleanString(user.city),
        mobilePhone: cleanString(user.mobilePhone),
        businessPhones: Array.isArray(user.businessPhones) ? user.businessPhones.filter(Boolean) : [],
        companyName: cleanString(user.companyName),
        accountEnabled,
        userType: cleanString(user.userType),
        lastLogin: '—',
        status: accountEnabled ? 'Active' : 'Disabled',
    };
}

function cleanString(value: string | null | undefined): string {
    return value?.trim() || '';
}
