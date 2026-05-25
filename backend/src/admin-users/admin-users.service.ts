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
        users.push(this.buildUserDisplay(user));
      }

      nextUrl = payload['@odata.nextLink'] ?? null;
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

  private async getGraphAccessToken(): Promise<string> {
    const tenantId = this.configService.get<string>('ENTRA_TENANT_ID')?.trim();
    const clientId = this.configService
      .get<string>('ENTRA_GRAPH_CLIENT_ID')
      ?.trim();
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
