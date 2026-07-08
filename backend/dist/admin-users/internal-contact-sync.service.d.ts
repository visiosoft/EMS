import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AdminUsersService } from './admin-users.service';
type SyncActionType = 'create' | 'update' | 'remove' | 'disable' | 'upToDate' | 'possibleDuplicate' | 'duplicateConflict' | 'emsOnly' | 'skipped';
export type InternalContactSyncFieldChange = {
    field: string;
    label: string;
    from: string | null;
    to: string | null;
    skipped?: boolean;
    reason?: string;
};
export type InternalContactSyncCandidate = {
    contactId?: number;
    entraUserId?: string;
    name: string;
    email: string;
    departments: string[];
    roles: string[];
};
export type InternalContactSyncRow = {
    actionId: string;
    type: SyncActionType;
    reason: string;
    entraUserId?: string;
    contactId?: number;
    entraName?: string;
    entraEmail?: string;
    emsName?: string;
    emsEmail?: string;
    changes: InternalContactSyncFieldChange[];
    candidateContacts?: InternalContactSyncCandidate[];
};
export type InternalContactSyncPreview = {
    generatedAt: string;
    internalCompany: {
        companyId: number;
        companyName: string;
    };
    jobTitleColumnAvailable: boolean;
    counts: Record<SyncActionType, number>;
    rows: InternalContactSyncRow[];
    warnings: string[];
};
export type ApplyInternalContactSyncDto = {
    selectedActionIds?: string[];
    manualMappings?: Array<{
        entraUserId?: string;
        targetEntraUserId?: string;
        contactId?: number;
    }>;
    selectedActionFields?: Record<string, string[]>;
};
export type InternalContactSyncApplyResult = {
    appliedAt: string;
    internalCompany: {
        companyId: number;
        companyName: string;
    };
    jobTitleColumnAvailable: boolean;
    created: number;
    updated: number;
    removed: number;
    disabled: number;
    skipped: number;
    skippedJobTitleWrites: number;
    createdEntraUsers?: Array<{
        displayName: string;
        userPrincipalName: string;
        temporaryPassword: string;
    }>;
    errors: string[];
};
export declare class InternalContactSyncService {
    private readonly adminUsersService;
    private readonly dataSource;
    private readonly configService;
    private appGraphTokenCache;
    constructor(adminUsersService: AdminUsersService, dataSource: DataSource, configService: ConfigService);
    previewInternalContactSync(graphAccessToken?: string): Promise<InternalContactSyncPreview>;
    updateEntraUserByIdentifier(userIdentifier: string, payload: Record<string, unknown>, graphAccessToken?: string): Promise<void>;
    updateAndVerifyEntraUserByIdentifier(userIdentifier: string, payload: Record<string, unknown>, graphAccessToken?: string): Promise<void>;
    applyInternalContactSync(dto: ApplyInternalContactSyncDto, graphAccessToken?: string): Promise<InternalContactSyncApplyResult>;
    previewEntraToEmsContactSync(graphAccessToken?: string): Promise<InternalContactSyncPreview>;
    applyEntraToEmsContactSync(dto: ApplyInternalContactSyncDto, graphAccessToken?: string): Promise<InternalContactSyncApplyResult>;
    previewEmsToEntraContactSync(graphAccessToken?: string): Promise<InternalContactSyncPreview>;
    applyEmsToEntraContactSync(dto: ApplyInternalContactSyncDto, graphAccessToken?: string): Promise<InternalContactSyncApplyResult>;
    private buildEntraToEmsSyncModel;
    private buildEmsToEntraSyncModel;
    private getInternalCompany;
    private hasContactInfoJobTitleColumn;
    private loadInternalContacts;
    private buildMatchedRow;
    private buildEmsToEntraMatchedRow;
    private buildSkippedUserRow;
    private buildCreateChanges;
    private buildUpdateChanges;
    private buildCreateEntraChanges;
    private buildUpdateEntraChanges;
    private addJobTitleChange;
    private toCandidateContact;
    private toCandidateEntraUser;
    private createInternalContactFromEntra;
    private updateInternalContactFromEntra;
    private removeInternalCompanyAssignments;
    private createEntraUserFromEmsContact;
    private updateEntraUserFromEmsContact;
    private disableEntraUser;
    private buildEntraUserPayloadFromEmsContact;
    private getGraphWriteAccessToken;
    private tryGetApplicationGraphAccessToken;
    private graphRequest;
    private graphGetJson;
    private verifyEntraUserPayload;
    private generateTemporaryPassword;
    private getConfigValue;
    private findOrCreateDepartment;
    private findOrCreateRole;
}
export {};
