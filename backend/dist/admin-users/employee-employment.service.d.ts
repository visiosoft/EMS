import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { EmployeeHealthInsuranceService } from './employee-health-insurance.service';
import { EntraProfileSyncService } from './entra-profile-sync.service';
export type WorkstationOption = {
    workLocationId: number;
    locationCode: string;
    officeCode: string;
    isAssigned: boolean;
    assignedToEmail: string | null;
};
export type WorkstationListResponse = {
    offices: {
        officeCode: string;
        workstations: WorkstationOption[];
    }[];
};
export type PhoneExtensionOption = {
    extensionId: number;
    extensionNumber: string;
    isAssigned: boolean;
    assignedToEmail: string | null;
};
export type PhoneExtensionListResponse = {
    extensions: PhoneExtensionOption[];
};
export type PhoneDeviceOption = {
    phoneId: number;
    macAddress: string;
    make: string;
    model: string;
    isAssigned: boolean;
    assignedToEmail: string | null;
};
export type PhoneDeviceListResponse = {
    phones: PhoneDeviceOption[];
};
export type PcDeviceOption = {
    computerId: number;
    pcName: string;
    make: string;
    model: string;
    serviceTag: string;
    bluetoothStatus: string;
    isAssigned: boolean;
    assignedToEmail: string | null;
};
export type PcDeviceListResponse = {
    computers: PcDeviceOption[];
};
export type EmployeeEmploymentProfileResponse = {
    contactId: number;
    contactAssignmentId: number;
    title: string;
    workEmail: string;
    department: string;
    department2: string;
    office: string;
    accessLevel: string;
    workAuthorization: string;
    workAuthorizationLinkUrl: string;
    workstation: string;
    startDate: string | null;
    supervisor: string;
    ptoAccrualRate: string;
    employmentAgreement: string;
    rampAccount: string;
    rampCreditCard: string;
    officeAddressId: number | null;
    officeStreet: string;
    officeAddress2: string;
    officeCity: string;
    officeState: string;
    officePostalCode: string;
    officeCountry: string;
    deskPhoneExtension: string;
    deskPhoneMac: string;
    deskPhoneBrand: string;
    deskPhoneModel: string;
    pcBrand: string;
    pcModel: string;
    pcServiceTag: string;
    bluetoothStatus: string;
    pcWindowsName: string;
    currentExtensionId: number | null;
    currentPhoneId: number | null;
    currentComputerId: number | null;
    departmentRank: string;
    role: string;
    employmentStatus: string;
    employmentType: string;
};
export declare class UpdateEmployeeEmploymentProfileDto {
    accessLevel?: string | null;
    title?: string | null;
    office?: string | null;
    workAuthorization?: string | null;
    workAuthorizationLinkUrl?: string | null;
    workstation?: string | null;
    startDate?: string | null;
    supervisor?: string | null;
    ptoAccrualRate?: string | null;
    employmentAgreement?: string | null;
    rampAccount?: string | null;
    rampCreditCard?: string | null;
    officeStreet?: string | null;
    officeAddress2?: string | null;
    officeCity?: string | null;
    officeState?: string | null;
    officePostalCode?: string | null;
    officeCountry?: string | null;
    deskPhoneExtensionId?: number | null;
    deskPhoneId?: number | null;
    pcComputerId?: number | null;
}
export declare class EmployeeEmploymentService {
    private readonly dataSource;
    private readonly auditContext;
    private readonly healthInsuranceService;
    private readonly entraProfileSyncService;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext, healthInsuranceService: EmployeeHealthInsuranceService, entraProfileSyncService: EntraProfileSyncService);
    getEmploymentProfile(userEmail: string): Promise<EmployeeEmploymentProfileResponse>;
    getAllAccessLevels(): Promise<{
        email: string;
        accessLevel: string;
    }[]>;
    updateEmploymentProfile(userEmail: string, dto: UpdateEmployeeEmploymentProfileDto): Promise<EmployeeEmploymentProfileResponse>;
    private syncEmploymentFieldsToEntra;
    listWorkstations(currentUserEmail?: string): Promise<WorkstationListResponse>;
    listPhoneExtensions(currentUserEmail?: string): Promise<PhoneExtensionListResponse>;
    listPhoneDevices(currentUserEmail?: string): Promise<PhoneDeviceListResponse>;
    listPcDevices(currentUserEmail?: string): Promise<PcDeviceListResponse>;
    private loadEmploymentProfile;
    private tableExists;
    private hasColumn;
    private getWorkAuthorizationLinkColumn;
    private upsertWorkAuthLink;
}
