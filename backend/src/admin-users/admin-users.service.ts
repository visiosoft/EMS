import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

type GraphUser = {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  givenName?: string | null;
  surname?: string | null;
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
  status: 'Active';
};

@Injectable()
export class AdminUsersService {
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
        `${user.givenName ?? ''} ${user.surname ?? ''}`.trim() ||
        user.mail?.trim() ||
        user.userPrincipalName?.trim() ||
        'Entra user',
      email: user.mail?.trim() || user.userPrincipalName?.trim() || '',
      role: 'Entra user',
      lastLogin: '—',
      status: 'Active',
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
        `https://graph.microsoft.com/v1.0/users/${encodedId}?$select=id,displayName,userPrincipalName,mail,givenName,surname`,
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
        `https://graph.microsoft.com/v1.0/users?$filter=id eq '${escaped}'&$select=id,displayName,userPrincipalName,mail,givenName,surname&$top=1`,
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
    return this.fetchGraphUsersWithSelect(
      accessToken,
      'id,displayName,userPrincipalName,mail,givenName,surname',
    );
  }

  private async fetchGraphUsersWithSelect(
    accessToken: string,
    select: string,
  ): Promise<GraphUser[]> {
    const users: GraphUser[] = [];
    let nextUrl: string | null =
      `https://graph.microsoft.com/v1.0/users?$select=${select}&$top=999`;

    while (nextUrl) {
      console.log(`[Graph API] Fetching: ${nextUrl}`);
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const graphError = await readGraphErrorDetail(response);
        console.error(`[Graph API] Failed with status ${response.status}: ${graphError}`);
        const permissionHint =
          response.status === 403
            ? ' Please confirm delegated Microsoft Graph permission User.ReadBasic.All is granted with admin consent.'
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

  private async getGraphAccessToken(
    graphAccessToken?: string,
  ): Promise<string> {
    const delegatedGraphToken = String(graphAccessToken ?? '').trim();
    if (delegatedGraphToken) {
      return delegatedGraphToken;
    }
    throw new ServiceUnavailableException(
      'Microsoft Graph delegated access token is required. Acquire a delegated Graph token in the frontend with https://graph.microsoft.com/User.ReadBasic.All.',
    );
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
