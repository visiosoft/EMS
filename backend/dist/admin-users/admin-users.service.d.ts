import { AuditRequestContext } from '../audit/audit-request-context.service';
type RawGraphUser = Record<string, unknown> & {
    id?: unknown;
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
    companyName: string;
    accountEnabled: boolean;
    userType: string;
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
export declare class AdminUsersService {
    private readonly auditContext;
    constructor(auditContext: AuditRequestContext);
    private graphGetJson;
    private buildUserDisplay;
    private buildUserForSync;
    listUsers(graphAccessToken?: string): Promise<AdminDirectoryUser[]>;
    listUsersForSync(graphAccessToken?: string): Promise<AdminDirectorySyncUser[]>;
    listRawUsers(graphAccessToken?: string): Promise<RawAdminDirectoryUsersDump>;
    findUserById(id: string): Promise<AdminDirectoryUser | null>;
    getUserLicenses(userId: string, graphAccessToken?: string): Promise<string[]>;
    getUserGroups(userId: string, graphAccessToken?: string): Promise<string[]>;
    private fetchGraphUsers;
    private fetchGraphUsersWithSelect;
    private fetchRawGraphUsersWithSelect;
    private fetchRawSingleUserPropertyGroups;
    private fetchRawSingleUserWithSelect;
    private graphFetchJson;
    private getGraphAccessToken;
}
export {};
