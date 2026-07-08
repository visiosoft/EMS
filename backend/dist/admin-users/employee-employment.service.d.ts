import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
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
    accessLevel: string;
    workAuthorization: string;
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
};
export declare class UpdateEmployeeEmploymentProfileDto {
    accessLevel?: string | null;
    workAuthorization?: string | null;
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
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    getEmploymentProfile(userEmail: string): Promise<EmployeeEmploymentProfileResponse>;
    getAllAccessLevels(): Promise<{
        email: string;
        accessLevel: string;
    }[]>;
    updateEmploymentProfile(userEmail: string, dto: UpdateEmployeeEmploymentProfileDto): Promise<EmployeeEmploymentProfileResponse>;
    listWorkstations(currentUserEmail?: string): Promise<WorkstationListResponse>;
    listPhoneExtensions(currentUserEmail?: string): Promise<PhoneExtensionListResponse>;
    listPhoneDevices(currentUserEmail?: string): Promise<PhoneDeviceListResponse>;
    listPcDevices(currentUserEmail?: string): Promise<PcDeviceListResponse>;
    private loadEmploymentProfile;
    private tableExists;
}
