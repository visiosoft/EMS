import {
    BadGatewayException,
    Injectable,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GraphUser = {
    id: string;
    displayName?: string | null;
    mail?: string | null;
    userPrincipalName?: string | null;
    accountEnabled?: boolean | null;
};

type GraphUsersResponse = {
    value?: GraphUser[];
    '@odata.nextLink'?: string;
};

export type AdminDirectoryUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    lastLogin: string;
    status: 'Active' | 'Disabled';
};

@Injectable()
export class AdminUsersService {
    constructor(private readonly configService: ConfigService) { }

    async listUsers(): Promise<AdminDirectoryUser[]> {
        const accessToken = await this.getGraphAccessToken();
        const users: AdminDirectoryUser[] = [];

        let nextUrl: string | null =
            'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled&$top=999';

        while (nextUrl) {
            const response = await fetch(nextUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new BadGatewayException(
                    `Microsoft Graph user lookup failed with status ${response.status}.`,
                );
            }

            const payload = (await response.json()) as GraphUsersResponse;
            for (const user of payload.value ?? []) {
                users.push({
                    id: user.id,
                    name:
                        user.displayName?.trim() ||
                        user.mail?.trim() ||
                        user.userPrincipalName?.trim() ||
                        'Entra user',
                    email: user.mail?.trim() || user.userPrincipalName?.trim() || '',
                    role: 'Entra user',
                    lastLogin: '—',
                    status: user.accountEnabled === false ? 'Disabled' : 'Active',
                });
            }

            nextUrl = payload['@odata.nextLink'] ?? null;
        }

        return users.sort((left, right) => left.name.localeCompare(right.name));
    }

    private async getGraphAccessToken(): Promise<string> {
        const tenantId = this.configService.get<string>('ENTRA_TENANT_ID')?.trim();
        const clientId = this.configService.get<string>('ENTRA_GRAPH_CLIENT_ID')?.trim();
        const clientSecret = this.configService
            .get<string>('ENTRA_GRAPH_CLIENT_SECRET')
            ?.trim();
        const scope =
            this.configService.get<string>('ENTRA_GRAPH_SCOPE')?.trim() ||
            'https://graph.microsoft.com/.default';

        if (!tenantId || !clientId || !clientSecret) {
            throw new ServiceUnavailableException(
                'Microsoft Graph integration is not configured. Set ENTRA_TENANT_ID, ENTRA_GRAPH_CLIENT_ID, and ENTRA_GRAPH_CLIENT_SECRET on the backend.',
            );
        }

        const tokenResponse = await fetch(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    scope,
                    grant_type: 'client_credentials',
                }),
            },
        );

        if (!tokenResponse.ok) {
            throw new BadGatewayException(
                `Could not acquire Microsoft Graph access token (status ${tokenResponse.status}).`,
            );
        }

        const payload = (await tokenResponse.json()) as { access_token?: string };
        if (!payload.access_token) {
            throw new BadGatewayException(
                'Microsoft Graph token response did not contain an access token.',
            );
        }

        return payload.access_token;
    }
}