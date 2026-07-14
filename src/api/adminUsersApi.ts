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

const IAE_ENTRA_COMPANY_NAME = 'Innovation Arts & Entertainment';

function normalizeCompanyName(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}

function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

const IAE_COMPANY_NORMALIZED = normalizeCompanyName(IAE_ENTRA_COMPANY_NAME);

export function isIaeEntraCompany(companyName: string | null | undefined): boolean {
    const normalized = normalizeCompanyName(companyName ?? '');
    if (!normalized) return false;
    if (normalized.includes(IAE_COMPANY_NORMALIZED)) return true;
    if (IAE_COMPANY_NORMALIZED.includes(normalized) && normalized.length > 5) return true;
    if (levenshteinDistance(normalized, IAE_COMPANY_NORMALIZED) <= 3) return true;
    return false;
}

export async function fetchAdminUsers(graphAccessToken: string): Promise<AdminDirectoryUserRow[]> {
    const users = await fetchEntraUsers(graphAccessToken);
    return users
        .filter((user) => isIaeEntraCompany(user.companyName))
        .map(mapGraphUserToRow)
        .sort((left, right) => left.name.localeCompare(right.name));
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
        department: user.department ? user.department.split('&').map(d => d.trim()).filter(Boolean).join(', ') : '',
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
