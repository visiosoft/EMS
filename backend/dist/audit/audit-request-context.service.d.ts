type AuditRequestStore = {
    userOid: string | null;
    userDisplayName: string | null;
    userEmail: string | null;
    userEmailCandidates: string[];
    graphAccessToken: string | null;
};
export declare class AuditRequestContext {
    private readonly storage;
    run<T>(store: AuditRequestStore, callback: () => T): T;
    getUserOid(): string | null;
    getUserDisplayName(): string | null;
    getUserEmail(): string | null;
    getUserEmailCandidates(): string[];
    getGraphAccessToken(): string | null;
}
export {};
