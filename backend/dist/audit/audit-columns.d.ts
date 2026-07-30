export declare abstract class AuditColumns {
    createdBy: string | null;
    createdAt: Date | null;
    modifiedBy: string | null;
    modifiedAt: Date | null;
}
export type AuditColumnFlags = {
    createdBy: boolean;
    createdAt: boolean;
    modifiedBy: boolean;
    modifiedAt: boolean;
};
export declare function applyAuditColumns(entity: object | undefined, flags: AuditColumnFlags, mode: 'insert' | 'update', userOid: string | null, now: Date): void;
