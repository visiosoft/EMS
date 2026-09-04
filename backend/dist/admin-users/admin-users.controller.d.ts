import { AdminUsersService } from './admin-users.service';
import { EmployeeCertificationsService } from './employee-certifications.service';
import { EmployeeEmploymentService, UpdateEmployeeEmploymentProfileDto } from './employee-employment.service';
import { EmployeeExperienceService } from './employee-experience.service';
import { EmployeeHealthInsuranceService, UpdateEmployeeHealthInsuranceDto, BulkUpdateHealthInsuranceDto } from './employee-health-insurance.service';
import { EmployeeProfileService, UpdateEmployeePersonalProfileDto } from './employee-profile.service';
import { EntraProfileSyncService } from './entra-profile-sync.service';
import { InternalContactSyncService } from './internal-contact-sync.service';
import type { ApplyInternalContactSyncDto } from './internal-contact-sync.service';
import { UserProfileService } from './user-profile.service';
import type { UpdateMyProfileDto } from './user-profile.service';
import { AccessLevelService } from '../common/access-level.service';
import { AccessLevel } from '../common/access-level.enum';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export declare class AdminUsersController {
    private readonly accessLevelService;
    private readonly adminUsersService;
    private readonly auditContext;
    private readonly employeeCertificationsService;
    private readonly employeeEmploymentService;
    private readonly employeeExperienceService;
    private readonly employeeHealthInsuranceService;
    private readonly employeeProfileService;
    private readonly entraProfileSyncService;
    private readonly internalContactSyncService;
    private readonly userProfileService;
    constructor(accessLevelService: AccessLevelService, adminUsersService: AdminUsersService, auditContext: AuditRequestContext, employeeCertificationsService: EmployeeCertificationsService, employeeEmploymentService: EmployeeEmploymentService, employeeExperienceService: EmployeeExperienceService, employeeHealthInsuranceService: EmployeeHealthInsuranceService, employeeProfileService: EmployeeProfileService, entraProfileSyncService: EntraProfileSyncService, internalContactSyncService: InternalContactSyncService, userProfileService: UserProfileService);
    getMyAccessLevel(): Promise<{
        accessLevel: AccessLevel;
    }>;
    listUsers(graphAccessToken?: string): Promise<import("./admin-users.service").AdminDirectoryUser[]>;
    listRawUsers(graphAccessToken?: string): Promise<import("./admin-users.service").RawAdminDirectoryUsersDump>;
    getMyProfile(): Promise<import("./user-profile.service").MyProfileResponse>;
    updateMyProfile(dto: UpdateMyProfileDto): Promise<import("./user-profile.service").MyProfileResponse>;
    getPersonalProfile(email: string): Promise<import("./employee-profile.service").EmployeePersonalProfileResponse>;
    updatePersonalProfile(email: string, dto: UpdateEmployeePersonalProfileDto): Promise<import("./employee-profile.service").EmployeePersonalProfileResponse>;
    getEmploymentProfile(email: string): Promise<import("./employee-employment.service").EmployeeEmploymentProfileResponse>;
    previewUserSyncFromEntra(email: string, graphAccessToken?: string): Promise<{
        changes: import("./entra-profile-sync.service").EntraProfileSyncFieldChange[];
    }>;
    applySelectedUserSync(email: string, body: {
        fields: string[];
    }, graphAccessToken?: string): Promise<{
        synced: boolean;
        changes: import("./entra-profile-sync.service").EntraProfileSyncFieldChange[];
    }>;
    getAllAccessLevels(): Promise<{
        email: string;
        accessLevel: string;
    }[]>;
    updateEmploymentProfile(email: string, dto: UpdateEmployeeEmploymentProfileDto): Promise<import("./employee-employment.service").EmployeeEmploymentProfileResponse>;
    getExperience(email: string): Promise<import("./employee-experience.service").EmployeeExperienceResponse>;
    getCertifications(email: string): Promise<import("./employee-certifications.service").EmployeeCertificationResponse>;
    getHealthInsurance(email: string): Promise<import("./employee-health-insurance.service").EmployeeHealthInsuranceResponse>;
    updateHealthInsurance(email: string, dto: UpdateEmployeeHealthInsuranceDto): Promise<import("./employee-health-insurance.service").EmployeeHealthInsuranceResponse>;
    bulkUpdateHealthInsurance(email: string, dto: BulkUpdateHealthInsuranceDto): Promise<import("./employee-health-insurance.service").EmployeeHealthInsuranceResponse>;
    listWorkstations(): Promise<import("./employee-employment.service").WorkstationListResponse>;
    listPhoneExtensions(forEmail?: string): Promise<import("./employee-employment.service").PhoneExtensionListResponse>;
    listPhoneDevices(forEmail?: string): Promise<import("./employee-employment.service").PhoneDeviceListResponse>;
    listPcDevices(forEmail?: string): Promise<import("./employee-employment.service").PcDeviceListResponse>;
    getUserLicenses(email: string, graphAccessToken?: string): Promise<string[]>;
    getUserGroups(email: string, graphAccessToken?: string): Promise<string[]>;
    previewInternalContactSync(graphAccessToken?: string): Promise<import("./internal-contact-sync.service").InternalContactSyncPreview>;
    previewEntraToEmsContactSync(graphAccessToken?: string): Promise<import("./internal-contact-sync.service").InternalContactSyncPreview>;
    applyEntraToEmsContactSync(dto: ApplyInternalContactSyncDto, graphAccessToken?: string): Promise<import("./internal-contact-sync.service").InternalContactSyncApplyResult>;
    previewEmsToEntraContactSync(graphAccessToken?: string): Promise<import("./internal-contact-sync.service").InternalContactSyncPreview>;
    applyEmsToEntraContactSync(dto: ApplyInternalContactSyncDto, graphAccessToken?: string): Promise<import("./internal-contact-sync.service").InternalContactSyncApplyResult>;
    applyInternalContactSync(dto: ApplyInternalContactSyncDto, graphAccessToken?: string): Promise<import("./internal-contact-sync.service").InternalContactSyncApplyResult>;
    previewEntraToEmsProfileSync(graphAccessToken?: string): Promise<import("./entra-profile-sync.service").EntraProfileSyncPreview>;
    applyEntraToEmsProfileSync(graphAccessToken?: string, targetEmail?: string): Promise<import("./entra-profile-sync.service").EntraProfileSyncResult>;
    previewEmsToEntraProfileSync(graphAccessToken?: string): Promise<import("./entra-profile-sync.service").EntraProfileSyncPreview>;
    applyEmsToEntraProfileSync(graphAccessToken?: string, targetEmail?: string): Promise<import("./entra-profile-sync.service").EntraProfileSyncResult>;
    previewEntraProfileSync(graphAccessToken?: string): Promise<import("./entra-profile-sync.service").EntraProfileSyncPreview>;
    applyEntraProfileSync(graphAccessToken?: string, targetEmail?: string): Promise<import("./entra-profile-sync.service").EntraProfileSyncResult>;
}
