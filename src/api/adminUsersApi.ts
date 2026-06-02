import { apiFetch } from './config';

export interface AdminDirectoryUserRow {
    id: string;
    name: string;
    email: string;
    role: string;
    lastLogin: string;
    status: 'Active' | 'Disabled';
}

export async function fetchAdminUsers(
    accessToken: string,
    graphAccessToken?: string | null,
): Promise<AdminDirectoryUserRow[]> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    };
    if (graphAccessToken) {
        headers['X-Entra-Graph-Access-Token'] = graphAccessToken;
    }

    return apiFetch<AdminDirectoryUserRow[]>('/admin/users', {
        headers,
    });
}
