import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuditRequestContext } from '../audit/audit-request-context.service';

type GraphUser = {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
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

type RawGraphUser = Record<string, unknown> & { id?: unknown };

type RawGraphUsersResponse = {
  value?: RawGraphUser[];
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
};

export type AdminDirectorySyncUser = {
  id: string;
  displayName: string;
  email: string;
  userPrincipalName: string;
  givenName: string;
  surname: string;
  department: string;
  jobTitle: string;
  mobilePhone: string;
  businessPhones: string[];
  accountEnabled: boolean;
  userType: string;
};

type GraphErrorDiagnostics = {
  code: string;
  requestId: string;
  clientRequestId: string;
};

type RawGraphPropertyGroup = {
  name: string;
  properties: string[];
  top?: number;
};

type RawGraphPropertyGroupResult = {
  name: string;
  properties: string[];
  status: 'ok' | 'failed';
  userCount?: number;
  error?: {
    status?: number;
    code?: string;
    requestId?: string;
    clientRequestId?: string;
  };
};

export type RawAdminDirectoryUsersDump = {
  generatedAt: string;
  source: 'Microsoft Graph /v1.0/users';
  notes: string[];
  userCount: number;
  propertyGroups: RawGraphPropertyGroupResult[];
  users: RawGraphUser[];
};

const GRAPH_RAW_COLLECTION_PROPERTY_GROUPS: RawGraphPropertyGroup[] = [
  {
    name: 'core',
    properties: [
      'id',
      'accountEnabled',
      'ageGroup',
      'businessPhones',
      'city',
      'companyName',
      'consentProvidedForMinor',
      'country',
      'createdDateTime',
      'creationType',
      'deletedDateTime',
      'department',
      'displayName',
      'employeeHireDate',
      'employeeId',
      'employeeOrgData',
      'employeeType',
      'externalUserState',
      'externalUserStateChangeDateTime',
      'faxNumber',
      'givenName',
      'identities',
      'imAddresses',
      'isManagementRestricted',
      'isResourceAccount',
      'jobTitle',
      'lastPasswordChangeDateTime',
      'legalAgeGroupClassification',
      'mail',
      'mailNickname',
      'mobilePhone',
      'officeLocation',
      'otherMails',
      'postalCode',
      'preferredDataLocation',
      'preferredLanguage',
      'proxyAddresses',
      'securityIdentifier',
      'showInAddressList',
      'state',
      'streetAddress',
      'surname',
      'usageLocation',
      'userPrincipalName',
      'userType',
    ],
  },
  {
    name: 'onPremises',
    properties: [
      'id',
      'onPremisesDistinguishedName',
      'onPremisesDomainName',
      'onPremisesExtensionAttributes',
      'onPremisesImmutableId',
      'onPremisesLastSyncDateTime',
      'onPremisesProvisioningErrors',
      'onPremisesSamAccountName',
      'onPremisesSecurityIdentifier',
      'onPremisesSyncEnabled',
      'onPremisesUserPrincipalName',
    ],
  },
  {
    name: 'licensesAndPlans',
    properties: [
      'id',
      'assignedLicenses',
      'assignedPlans',
      'licenseAssignmentStates',
      'provisionedPlans',
      'serviceProvisioningErrors',
    ],
  },
  {
    name: 'passwordPoliciesAndSessions',
    properties: [
      'id',
      'passwordPolicies',
      'refreshTokensValidFromDateTime',
      'signInSessionsValidFromDateTime',
    ],
  },
  {
    name: 'signInActivity',
    properties: ['id', 'signInActivity'],
    top: 500,
  },
  {
    name: 'lifecycle',
    properties: ['id', 'employeeLeaveDateTime'],
  },
  {
    name: 'customSecurityAttributes',
    properties: ['id', 'customSecurityAttributes'],
  },
];

const GRAPH_RAW_SINGLE_USER_PROPERTY_GROUPS: RawGraphPropertyGroup[] = [
  {
    name: 'singleUserProfile',
    properties: [
      'id',
      'aboutMe',
      'birthday',
      'hireDate',
      'interests',
      'mySite',
      'pastProjects',
      'preferredName',
      'responsibilities',
      'schools',
      'skills',
    ],
  },
  {
    name: 'mailboxSettings',
    properties: ['id', 'mailboxSettings'],
  },
];

@Injectable()
export class AdminUsersService {
  constructor(private readonly auditContext: AuditRequestContext) {}

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
    const accountEnabled = user.accountEnabled !== false;
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
      jobTitle: user.jobTitle?.trim() || '',
      department: user.department?.trim() || '',
      employeeType: user.employeeType?.trim() || '',
      officeLocation: user.officeLocation?.trim() || '',
      city: user.city?.trim() || '',
      mobilePhone: user.mobilePhone?.trim() || '',
      businessPhones: Array.isArray(user.businessPhones)
        ? user.businessPhones.filter(Boolean)
        : [],
      companyName: user.companyName?.trim() || '',
      accountEnabled,
      userType: user.userType?.trim() || '',
      lastLogin: '—',
      status: accountEnabled ? 'Active' : 'Disabled',
    };
  }

  private buildUserForSync(user: GraphUser): AdminDirectorySyncUser {
    const accountEnabled = user.accountEnabled !== false;
    const email = user.mail?.trim() || user.userPrincipalName?.trim() || '';
    const displayName =
      user.displayName?.trim() ||
      `${user.givenName ?? ''} ${user.surname ?? ''}`.trim() ||
      email ||
      'Entra user';

    return {
      id: user.id,
      displayName,
      email,
      userPrincipalName: user.userPrincipalName?.trim() || '',
      givenName: user.givenName?.trim() || '',
      surname: user.surname?.trim() || '',
      department: user.department?.trim() || '',
      jobTitle: user.jobTitle?.trim() || '',
      mobilePhone: user.mobilePhone?.trim() || '',
      businessPhones: Array.isArray(user.businessPhones)
        ? user.businessPhones.filter(Boolean).map((phone) => phone.trim())
        : [],
      accountEnabled,
      userType: user.userType?.trim() || '',
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

  async listUsersForSync(
    graphAccessToken?: string,
  ): Promise<AdminDirectorySyncUser[]> {
    const accessToken = await this.getGraphAccessToken(graphAccessToken);

    return (await this.fetchGraphUsers(accessToken))
      .map((user) => this.buildUserForSync(user))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  async listRawUsers(
    graphAccessToken?: string,
  ): Promise<RawAdminDirectoryUsersDump> {
    const accessToken = await this.getGraphAccessToken(graphAccessToken);
    const usersById = new Map<string, RawGraphUser>();
    const userOrder: string[] = [];
    const propertyGroups: RawGraphPropertyGroupResult[] = [];

    for (const group of GRAPH_RAW_COLLECTION_PROPERTY_GROUPS) {
      try {
        const rows = await this.fetchRawGraphUsersWithSelect(
          accessToken,
          group.properties,
          group.top,
        );
        for (const row of rows) {
          mergeRawGraphUser(usersById, userOrder, row);
        }
        propertyGroups.push({
          name: group.name,
          properties: group.properties,
          status: 'ok',
          userCount: rows.length,
        });
      } catch (error) {
        propertyGroups.push({
          name: group.name,
          properties: group.properties,
          status: 'failed',
          error: graphFetchErrorForDump(error),
        });
      }
    }

    if (userOrder.length === 0) {
      throw new BadGatewayException(
        'Microsoft Graph raw user lookup failed for all property groups.',
      );
    }

    await this.fetchRawSingleUserPropertyGroups(
      accessToken,
      userOrder,
      usersById,
      propertyGroups,
    );

    return {
      generatedAt: new Date().toISOString(),
      source: 'Microsoft Graph /v1.0/users',
      notes: [
        'Temporary diagnostic export. Remove this route after analysis.',
        'Microsoft Graph does not support a wildcard all-properties user collection request, so this endpoint requests documented property groups and merges any groups that succeed.',
        'Some fields require extra Graph permissions or Entra admin roles. Failed groups are listed in propertyGroups.',
        'Credential values are not requested.',
      ],
      userCount: userOrder.length,
      propertyGroups,
      users: userOrder.map((id) => usersById.get(id)).filter(isRawGraphUser),
    };
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
        `https://graph.microsoft.com/v1.0/users/${encodedId}?$select=id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,employeeType,employeeId,mobilePhone,businessPhones,officeLocation,city,state,country,companyName,accountEnabled,userType`,
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
        `https://graph.microsoft.com/v1.0/users?$filter=id eq '${escaped}'&$select=id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,employeeType,employeeId,mobilePhone,businessPhones,officeLocation,city,state,country,companyName,accountEnabled,userType&$top=1`,
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
          jobTitle: '',
          department: '',
          employeeType: '',
          officeLocation: '',
          city: '',
          mobilePhone: '',
          businessPhones: [],
          companyName: '',
          accountEnabled: true,
          userType: '',
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
      'id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,employeeType,employeeId,mobilePhone,businessPhones,officeLocation,city,state,country,companyName,accountEnabled,userType',
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
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const graphError = await readGraphErrorDetail(response);
        console.error(
          `[Graph API] User list request failed: ${formatGraphErrorForLog(
            response.status,
            graphError,
          )}`,
        );
        const permissionHint =
          response.status === 403
            ? ' Please confirm delegated Microsoft Graph permission User.Read.All is granted with admin consent.'
            : '';
        throw new BadGatewayException(
          `Microsoft Graph user lookup failed with status ${response.status}.${formatGraphErrorForClient(
            graphError,
          )}${permissionHint}`,
        );
      }

      const payload = (await response.json()) as GraphUsersResponse;
      users.push(...(payload.value ?? []));
      nextUrl = payload['@odata.nextLink'] ?? null;
    }

    return users;
  }

  private async fetchRawGraphUsersWithSelect(
    accessToken: string,
    properties: string[],
    top = 999,
  ): Promise<RawGraphUser[]> {
    const users: RawGraphUser[] = [];
    const params = new URLSearchParams({
      $select: uniqueProperties(properties).join(','),
      $top: String(top),
    });
    let nextUrl: string | null =
      `https://graph.microsoft.com/v1.0/users?${params.toString()}`;

    while (nextUrl) {
      const payload = await this.graphFetchJson<RawGraphUsersResponse>(
        accessToken,
        nextUrl,
      );
      users.push(...(payload.value ?? []));
      nextUrl = payload['@odata.nextLink'] ?? null;
    }

    return users;
  }

  private async fetchRawSingleUserPropertyGroups(
    accessToken: string,
    userIds: string[],
    usersById: Map<string, RawGraphUser>,
    propertyGroups: RawGraphPropertyGroupResult[],
  ): Promise<void> {
    const groupResults = new Map<string, RawGraphPropertyGroupResult>();
    for (const group of GRAPH_RAW_SINGLE_USER_PROPERTY_GROUPS) {
      const result: RawGraphPropertyGroupResult = {
        name: group.name,
        properties: group.properties,
        status: 'ok',
        userCount: 0,
      };
      groupResults.set(group.name, result);
      propertyGroups.push(result);
    }

    await runInChunks(userIds, 6, async (userId) => {
      for (const group of GRAPH_RAW_SINGLE_USER_PROPERTY_GROUPS) {
        try {
          const row = await this.fetchRawSingleUserWithSelect(
            accessToken,
            userId,
            group.properties,
          );
          mergeRawGraphUser(usersById, [], row);
          const result = groupResults.get(group.name);
          if (result) result.userCount = (result.userCount ?? 0) + 1;
        } catch (error) {
          addRawGraphUserFetchError(usersById.get(userId), {
            group: group.name,
            ...graphFetchErrorForDump(error),
          });
          const result = groupResults.get(group.name);
          if (result && result.status === 'ok') {
            result.status = 'failed';
            result.error = graphFetchErrorForDump(error);
          }
        }
      }
    });
  }

  private async fetchRawSingleUserWithSelect(
    accessToken: string,
    userId: string,
    properties: string[],
  ): Promise<RawGraphUser> {
    const encodedId = encodeURIComponent(userId);
    const params = new URLSearchParams({
      $select: uniqueProperties(properties).join(','),
    });
    return this.graphFetchJson<RawGraphUser>(
      accessToken,
      `https://graph.microsoft.com/v1.0/users/${encodedId}?${params.toString()}`,
    );
  }

  private async graphFetchJson<T>(
    accessToken: string,
    url: string,
  ): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new GraphFetchError(
        response.status,
        await readGraphErrorDetail(response),
      );
    }

    return (await response.json()) as T;
  }

  private async getGraphAccessToken(
    graphAccessToken?: string,
  ): Promise<string> {
    const delegatedGraphToken = String(
      graphAccessToken ?? this.auditContext.getGraphAccessToken() ?? '',
    ).trim();
    if (delegatedGraphToken) {
      return delegatedGraphToken;
    }
    throw new ServiceUnavailableException(
      'Microsoft Graph delegated access token is required. Acquire a delegated Graph token in the frontend with https://graph.microsoft.com/User.Read.All.',
    );
  }
}

class GraphFetchError extends Error {
  constructor(
    readonly status: number,
    readonly diagnostics: GraphErrorDiagnostics | null,
  ) {
    super(`Microsoft Graph request failed with status ${status}.`);
  }
}

async function readGraphErrorDetail(
  response: Response,
): Promise<GraphErrorDiagnostics | null> {
  try {
    const body = (await response.json()) as {
      error?: {
        code?: string;
        innerError?: {
          'request-id'?: string;
          requestId?: string;
          'client-request-id'?: string;
          clientRequestId?: string;
        };
      };
    };
    const inner = body.error?.innerError;
    const code = String(body.error?.code ?? '').trim();
    const requestId = String(
      inner?.['request-id'] ??
        inner?.requestId ??
        response.headers.get('request-id') ??
        '',
    ).trim();
    const clientRequestId = String(
      inner?.['client-request-id'] ??
        inner?.clientRequestId ??
        response.headers.get('client-request-id') ??
        '',
    ).trim();

    if (!code && !requestId && !clientRequestId) return null;
    return { code, requestId, clientRequestId };
  } catch {
    return null;
  }
}

function formatGraphErrorForLog(
  status: number,
  diagnostics: GraphErrorDiagnostics | null,
): string {
  const fields = [`status=${status}`];
  if (diagnostics?.code) fields.push(`code=${safeLogValue(diagnostics.code)}`);
  if (diagnostics?.requestId) {
    fields.push(`requestId=${safeLogValue(diagnostics.requestId)}`);
  }
  if (diagnostics?.clientRequestId) {
    fields.push(`clientRequestId=${safeLogValue(diagnostics.clientRequestId)}`);
  }
  return fields.join(' ');
}

function formatGraphErrorForClient(
  diagnostics: GraphErrorDiagnostics | null,
): string {
  const fields: string[] = [];
  if (diagnostics?.code) fields.push(`code ${diagnostics.code}`);
  if (diagnostics?.requestId) fields.push(`request ID ${diagnostics.requestId}`);
  return fields.length ? ` Graph diagnostics: ${fields.join(', ')}.` : '';
}

function safeLogValue(value: string): string {
  return value.replace(/[^\w:.-]/g, '_').slice(0, 120);
}

function uniqueProperties(properties: string[]): string[] {
  return Array.from(new Set(['id', ...properties]));
}

function mergeRawGraphUser(
  usersById: Map<string, RawGraphUser>,
  userOrder: string[],
  row: RawGraphUser,
): void {
  const id = String(row.id ?? '').trim();
  if (!id) return;
  const existing = usersById.get(id);
  if (existing) {
    Object.assign(existing, row);
    return;
  }
  usersById.set(id, { ...row, id });
  userOrder.push(id);
}

function isRawGraphUser(value: RawGraphUser | undefined): value is RawGraphUser {
  return Boolean(value);
}

function graphFetchErrorForDump(error: unknown): {
  status?: number;
  code?: string;
  requestId?: string;
  clientRequestId?: string;
} {
  if (error instanceof GraphFetchError) {
    return {
      status: error.status,
      code: error.diagnostics?.code || undefined,
      requestId: error.diagnostics?.requestId || undefined,
      clientRequestId: error.diagnostics?.clientRequestId || undefined,
    };
  }
  return {};
}

function addRawGraphUserFetchError(
  user: RawGraphUser | undefined,
  error: Record<string, unknown>,
): void {
  if (!user) return;
  const key = '__graphFetchErrors';
  const existing = user[key];
  if (Array.isArray(existing)) {
    existing.push(error);
  } else {
    user[key] = [error];
  }
}

async function runInChunks<T>(
  items: T[],
  size: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(task));
  }
}
