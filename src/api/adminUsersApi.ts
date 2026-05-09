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
): Promise<AdminDirectoryUserRow[]> {
    return apiFetch<AdminDirectoryUserRow[]>('/admin/users', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
}