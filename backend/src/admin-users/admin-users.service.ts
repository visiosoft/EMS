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

type GraphDirectoryObject = {
  id?: string;
  displayName?: string | null;
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
  constructor(private readonly configService: ConfigService) {}

  private async graphGetJson<T>(
    accessToken: string,
    url: string,
    notFoundAsNull = false,
  ): Promise<T | null> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (notFoundAsNull && response.status === 404) return null;
    if (!response.ok) {
      throw new BadGatewayException(
        `Microsoft Graph request failed with status ${response.status}.`,
      );
    }
    return (await response.json()) as T;
  }

  private buildUserDisplay(user: GraphUser): AdminDirectoryUser {
    return {
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
    };
  }

  async listUsers(graphAccessToken?: string): Promise<AdminDirectoryUser[]> {
    const accessToken = await this.getGraphAccessToken(graphAccessToken);
    const users: AdminDirectoryUser[] = [];

    for (const user of await this.fetchGraphUsers(accessToken)) {
      users.push(this.buildUserDisplay(user));
    }

    return users.sort((left, right) => left.name.localeCompare(right.name));
  }

  async findUserById(id: string): Promise<AdminDirectoryUser | null> {
    const userId = String(id ?? '').trim();
    if (!userId) return null;

    const accessToken = await this.getGraphAccessToken();
    const encodedId = encodeURIComponent(userId);

    // 1) Direct users/{id}
    try {
      const directUser = await this.graphGetJson<GraphUser>(
        accessToken,
        `https://graph.microsoft.com/v1.0/users/${encodedId}?$select=id,displayName,mail,userPrincipalName,accountEnabled`,
        true,
      );
      if (directUser?.id) return this.buildUserDisplay(directUser);
    } catch {
      // continue with alternate strategies below
    }

    // 2) Filtered users query by id
    try {
      const escaped = userId.replace(/'/g, "''");
      const filteredUsers = await this.graphGetJson<GraphUsersResponse>(
        accessToken,
        `https://graph.microsoft.com/v1.0/users?$filter=id eq '${escaped}'&$select=id,displayName,mail,userPrincipalName,accountEnabled&$top=1`,
      );
      const filteredUser = filteredUsers?.value?.[0];
      if (filteredUser?.id) return this.buildUserDisplay(filteredUser);
    } catch {
      // continue
    }

    // 3) Directory object fallback (useful for some tenants/guest representations)
    try {
      const directoryObj = await this.graphGetJson<GraphDirectoryObject>(
        accessToken,
        `https://graph.microsoft.com/v1.0/directoryObjects/${encodedId}?$select=id,displayName`,
        true,
      );
      const objectId = String(directoryObj?.id ?? '').trim();
      const displayName = String(directoryObj?.displayName ?? '').trim();
      if (objectId && displayName) {
        return {
          id: objectId,
          name: displayName,
          email: '',
          role: 'Entra user',
          lastLogin: '—',
          status: 'Active',
        };
      }
    } catch {
      // no-op
    }
    return null;
  }

  private async fetchGraphUsers(accessToken: string): Promise<GraphUser[]> {
    const primarySelect =
      'id,displayName,mail,userPrincipalName,accountEnabled';
    try {
      return await this.fetchGraphUsersWithSelect(accessToken, primarySelect);
    } catch (error) {
      if (
        error instanceof BadGatewayException &&
        String(error.message).includes('status 403')
      ) {
        return this.fetchGraphUsersWithSelect(
          accessToken,
          'id,displayName,mail,userPrincipalName',
        );
      }
      throw error;
    }
  }

  private async fetchGraphUsersWithSelect(
    accessToken: string,
    select: string,
  ): Promise<GraphUser[]> {
    const users: GraphUser[] = [];
    let nextUrl: string | null = `https://graph.microsoft.com/v1.0/users?$select=${select}&$top=999`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const graphError = await readGraphErrorDetail(response);
        const permissionHint =
          response.status === 403
            ? ' Grant Microsoft Graph directory consent (User.ReadBasic.All or Directory.Read.All), or configure backend ENTRA_GRAPH_CLIENT_ID and ENTRA_GRAPH_CLIENT_SECRET with Graph application permission.'
            : '';
        throw new BadGatewayException(
          `Microsoft Graph user lookup failed with status ${response.status}.${graphError}${permissionHint}`,
        );
      }

      const payload = (await response.json()) as GraphUsersResponse;
      users.push(...(payload.value ?? []));
      nextUrl = payload['@odata.nextLink'] ?? null;
    }

    return users;
  }

  private async getGraphAccessToken(graphAccessToken?: string): Promise<string> {
    const delegatedGraphToken = String(graphAccessToken ?? '').trim();
    const tenantId = this.getConfigValue(
      'ENTRA_TENANT_ID',
      'VITE_ENTRA_TENANT_ID',
    );
    const clientId = this.getConfigValue(
      'ENTRA_GRAPH_CLIENT_ID',
      'ENTRA_CLIENT_ID',
      'VITE_ENTRA_CLIENT_ID',
    );
    const clientSecret = this.getConfigValue(
      'ENTRA_GRAPH_CLIENT_SECRET',
      'ENTRA_CLIENT_SECRET',
      'ENTRA_API_CLIENT_SECRET',
    );
    const scope =
      this.configService.get<string>('ENTRA_GRAPH_SCOPE')?.trim() ||
      'https://graph.microsoft.com/.default';

    if (!tenantId || !clientId || !clientSecret) {
      if (delegatedGraphToken) return delegatedGraphToken;
      throw new ServiceUnavailableException(
        'Microsoft Graph integration is not configured. Set ENTRA_TENANT_ID or VITE_ENTRA_TENANT_ID plus ENTRA_GRAPH_CLIENT_ID and ENTRA_GRAPH_CLIENT_SECRET, or allow the frontend delegated Graph scope.',
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

  private getConfigValue(...keys: string[]): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key)?.trim();
      if (value) return value;
    }
    return '';
  }
}

async function readGraphErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    const code = String(body.error?.code ?? '').trim();
    const message = String(body.error?.message ?? '').trim();
    if (!code && !message) return '';
    return ` ${[code, message].filter(Boolean).join(': ')}`;
  } catch {
    return '';
  }
}
