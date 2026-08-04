"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const GRAPH_RAW_COLLECTION_PROPERTY_GROUPS = [
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
const GRAPH_RAW_SINGLE_USER_PROPERTY_GROUPS = [
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
let AdminUsersService = class AdminUsersService {
    auditContext;
    constructor(auditContext) {
        this.auditContext = auditContext;
    }
    async graphGetJson(accessToken, url, notFoundAsNull = false) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (notFoundAsNull && response.status === 404)
            return null;
        if (!response.ok) {
            throw new common_1.BadGatewayException(`Microsoft Graph request failed with status ${response.status}.`);
        }
        return (await response.json());
    }
    buildUserDisplay(user) {
        const accountEnabled = user.accountEnabled !== false;
        return {
            id: user.id,
            name: user.displayName?.trim() ||
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
    buildUserForSync(user) {
        const accountEnabled = user.accountEnabled !== false;
        const email = user.mail?.trim() || user.userPrincipalName?.trim() || '';
        const displayName = user.displayName?.trim() ||
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
            companyName: user.companyName?.trim() || '',
            accountEnabled,
            userType: user.userType?.trim() || '',
        };
    }
    async listUsers(graphAccessToken) {
        const accessToken = await this.getGraphAccessToken(graphAccessToken);
        const users = [];
        for (const user of await this.fetchGraphUsers(accessToken)) {
            users.push(this.buildUserDisplay(user));
        }
        return users.sort((left, right) => left.name.localeCompare(right.name));
    }
    async listUsersForSync(graphAccessToken) {
        const accessToken = await this.getGraphAccessToken(graphAccessToken);
        return (await this.fetchGraphUsers(accessToken))
            .map((user) => this.buildUserForSync(user))
            .sort((left, right) => left.displayName.localeCompare(right.displayName));
    }
    async listRawUsers(graphAccessToken) {
        const accessToken = await this.getGraphAccessToken(graphAccessToken);
        const usersById = new Map();
        const userOrder = [];
        const propertyGroups = [];
        for (const group of GRAPH_RAW_COLLECTION_PROPERTY_GROUPS) {
            try {
                const rows = await this.fetchRawGraphUsersWithSelect(accessToken, group.properties, group.top);
                for (const row of rows) {
                    mergeRawGraphUser(usersById, userOrder, row);
                }
                propertyGroups.push({
                    name: group.name,
                    properties: group.properties,
                    status: 'ok',
                    userCount: rows.length,
                });
            }
            catch (error) {
                propertyGroups.push({
                    name: group.name,
                    properties: group.properties,
                    status: 'failed',
                    error: graphFetchErrorForDump(error),
                });
            }
        }
        if (userOrder.length === 0) {
            throw new common_1.BadGatewayException('Microsoft Graph raw user lookup failed for all property groups.');
        }
        await this.fetchRawSingleUserPropertyGroups(accessToken, userOrder, usersById, propertyGroups);
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
    async findUserById(id) {
        const userId = String(id ?? '').trim();
        if (!userId)
            return null;
        const accessToken = await this.getGraphAccessToken();
        const encodedId = encodeURIComponent(userId);
        try {
            const directUser = await this.graphGetJson(accessToken, `https://graph.microsoft.com/v1.0/users/${encodedId}?$select=id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,employeeType,employeeId,mobilePhone,businessPhones,officeLocation,city,state,country,companyName,accountEnabled,userType`, true);
            if (directUser?.id)
                return this.buildUserDisplay(directUser);
        }
        catch {
        }
        try {
            const escaped = userId.replace(/'/g, "''");
            const filteredUsers = await this.graphGetJson(accessToken, `https://graph.microsoft.com/v1.0/users?$filter=id eq '${escaped}'&$select=id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,employeeType,employeeId,mobilePhone,businessPhones,officeLocation,city,state,country,companyName,accountEnabled,userType&$top=1`);
            const filteredUser = filteredUsers?.value?.[0];
            if (filteredUser?.id)
                return this.buildUserDisplay(filteredUser);
        }
        catch {
        }
        try {
            const directoryObj = await this.graphGetJson(accessToken, `https://graph.microsoft.com/v1.0/directoryObjects/${encodedId}?$select=id,displayName`, true);
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
        }
        catch {
        }
        return null;
    }
    async getUserLicenses(userId, graphAccessToken) {
        const accessToken = await this.getGraphAccessToken(graphAccessToken);
        const encodedId = encodeURIComponent(userId);
        try {
            const data = await this.graphGetJson(accessToken, `https://graph.microsoft.com/v1.0/users/${encodedId}/licenseDetails`, true);
            return (data?.value
                ?.map((l) => l.skuPartNumber ?? '')
                .filter(Boolean) ?? []);
        }
        catch {
            return [];
        }
    }
    async getUserGroups(userId, graphAccessToken) {
        const accessToken = await this.getGraphAccessToken(graphAccessToken);
        const encodedId = encodeURIComponent(userId);
        const groups = [];
        let nextUrl = `https://graph.microsoft.com/v1.0/users/${encodedId}/memberOf/microsoft.graph.group?$select=id,displayName&$top=999`;
        try {
            while (nextUrl) {
                const payload = await this.graphGetJson(accessToken, nextUrl);
                for (const g of payload?.value ?? []) {
                    const name = g.displayName?.trim();
                    if (name)
                        groups.push(name);
                }
                nextUrl = payload?.['@odata.nextLink'] ?? null;
            }
        }
        catch {
        }
        return groups.sort((a, b) => a.localeCompare(b));
    }
    async fetchGraphUsers(accessToken) {
        return this.fetchGraphUsersWithSelect(accessToken, 'id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,employeeType,employeeId,mobilePhone,businessPhones,officeLocation,city,state,country,companyName,accountEnabled,userType');
    }
    async fetchGraphUsersWithSelect(accessToken, select) {
        const users = [];
        let nextUrl = `https://graph.microsoft.com/v1.0/users?$select=${select}&$top=999`;
        while (nextUrl) {
            const response = await fetch(nextUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                const graphError = await readGraphErrorDetail(response);
                console.error(`[Graph API] User list request failed: ${formatGraphErrorForLog(response.status, graphError)}`);
                const permissionHint = response.status === 403
                    ? ' Please confirm delegated Microsoft Graph permission User.Read.All is granted with admin consent.'
                    : '';
                throw new common_1.BadGatewayException(`Microsoft Graph user lookup failed with status ${response.status}.${formatGraphErrorForClient(graphError)}${permissionHint}`);
            }
            const payload = (await response.json());
            users.push(...(payload.value ?? []));
            nextUrl = payload['@odata.nextLink'] ?? null;
        }
        return users;
    }
    async fetchRawGraphUsersWithSelect(accessToken, properties, top = 999) {
        const users = [];
        const params = new URLSearchParams({
            $select: uniqueProperties(properties).join(','),
            $top: String(top),
        });
        let nextUrl = `https://graph.microsoft.com/v1.0/users?${params.toString()}`;
        while (nextUrl) {
            const payload = await this.graphFetchJson(accessToken, nextUrl);
            users.push(...(payload.value ?? []));
            nextUrl = payload['@odata.nextLink'] ?? null;
        }
        return users;
    }
    async fetchRawSingleUserPropertyGroups(accessToken, userIds, usersById, propertyGroups) {
        const groupResults = new Map();
        for (const group of GRAPH_RAW_SINGLE_USER_PROPERTY_GROUPS) {
            const result = {
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
                    const row = await this.fetchRawSingleUserWithSelect(accessToken, userId, group.properties);
                    mergeRawGraphUser(usersById, [], row);
                    const result = groupResults.get(group.name);
                    if (result)
                        result.userCount = (result.userCount ?? 0) + 1;
                }
                catch (error) {
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
    async fetchRawSingleUserWithSelect(accessToken, userId, properties) {
        const encodedId = encodeURIComponent(userId);
        const params = new URLSearchParams({
            $select: uniqueProperties(properties).join(','),
        });
        return this.graphFetchJson(accessToken, `https://graph.microsoft.com/v1.0/users/${encodedId}?${params.toString()}`);
    }
    async graphFetchJson(accessToken, url) {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            throw new GraphFetchError(response.status, await readGraphErrorDetail(response));
        }
        return (await response.json());
    }
    async getGraphAccessToken(graphAccessToken) {
        const delegatedGraphToken = String(graphAccessToken ?? this.auditContext.getGraphAccessToken() ?? '').trim();
        if (delegatedGraphToken) {
            return delegatedGraphToken;
        }
        throw new common_1.ServiceUnavailableException('Microsoft Graph delegated access token is required. Acquire a delegated Graph token in the frontend with https://graph.microsoft.com/User.Read.All.');
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_request_context_service_1.AuditRequestContext])
], AdminUsersService);
class GraphFetchError extends Error {
    status;
    diagnostics;
    constructor(status, diagnostics) {
        super(`Microsoft Graph request failed with status ${status}.`);
        this.status = status;
        this.diagnostics = diagnostics;
    }
}
async function readGraphErrorDetail(response) {
    try {
        const body = (await response.json());
        const inner = body.error?.innerError;
        const code = String(body.error?.code ?? '').trim();
        const requestId = String(inner?.['request-id'] ??
            inner?.requestId ??
            response.headers.get('request-id') ??
            '').trim();
        const clientRequestId = String(inner?.['client-request-id'] ??
            inner?.clientRequestId ??
            response.headers.get('client-request-id') ??
            '').trim();
        if (!code && !requestId && !clientRequestId)
            return null;
        return { code, requestId, clientRequestId };
    }
    catch {
        return null;
    }
}
function formatGraphErrorForLog(status, diagnostics) {
    const fields = [`status=${status}`];
    if (diagnostics?.code)
        fields.push(`code=${safeLogValue(diagnostics.code)}`);
    if (diagnostics?.requestId) {
        fields.push(`requestId=${safeLogValue(diagnostics.requestId)}`);
    }
    if (diagnostics?.clientRequestId) {
        fields.push(`clientRequestId=${safeLogValue(diagnostics.clientRequestId)}`);
    }
    return fields.join(' ');
}
function formatGraphErrorForClient(diagnostics) {
    const fields = [];
    if (diagnostics?.code)
        fields.push(`code ${diagnostics.code}`);
    if (diagnostics?.requestId)
        fields.push(`request ID ${diagnostics.requestId}`);
    return fields.length ? ` Graph diagnostics: ${fields.join(', ')}.` : '';
}
function safeLogValue(value) {
    return value.replace(/[^\w:.-]/g, '_').slice(0, 120);
}
function uniqueProperties(properties) {
    return Array.from(new Set(['id', ...properties]));
}
function mergeRawGraphUser(usersById, userOrder, row) {
    const id = String(row.id ?? '').trim();
    if (!id)
        return;
    const existing = usersById.get(id);
    if (existing) {
        Object.assign(existing, row);
        return;
    }
    usersById.set(id, { ...row, id });
    userOrder.push(id);
}
function isRawGraphUser(value) {
    return Boolean(value);
}
function graphFetchErrorForDump(error) {
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
function addRawGraphUserFetchError(user, error) {
    if (!user)
        return;
    const key = '__graphFetchErrors';
    const existing = user[key];
    if (Array.isArray(existing)) {
        existing.push(error);
    }
    else {
        user[key] = [error];
    }
}
async function runInChunks(items, size, task) {
    for (let index = 0; index < items.length; index += size) {
        await Promise.all(items.slice(index, index + size).map(task));
    }
}
//# sourceMappingURL=admin-users.service.js.map