import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { InternalContactSyncService } from './internal-contact-sync.service';
export type MyProfileResponse = {
    contactId: number;
    contactInfoId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string;
    workPhone: string;
    departmentName: string;
    roleNames: string[];
    jobTitle: string;
    jobTitleColumnAvailable: boolean;
    entraSyncWarnings?: string[];
};
export type UpdateMyProfileDto = {
    firstName?: string;
    lastName?: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    departmentName?: string;
    jobTitle?: string | null;
};
export declare class UserProfileService {
    private readonly dataSource;
    private readonly auditContext;
    private readonly internalContactSyncService;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext, internalContactSyncService: InternalContactSyncService);
    getMyProfile(): Promise<MyProfileResponse>;
    updateMyProfile(dto: UpdateMyProfileDto): Promise<MyProfileResponse>;
    private syncProfileToEntra;
    private getSignedInEmailCandidates;
    private loadMyInternalProfile;
    private hasContactInfoJobTitleColumn;
    private findOrCreateDepartment;
}
