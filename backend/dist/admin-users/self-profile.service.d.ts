import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { AdminUsersService } from './admin-users.service';
import { EmployeeExperienceService, type EmployeeExperienceResponse } from './employee-experience.service';
import { EmployeeHealthInsuranceService, type EmployeeHealthInsuranceResponse } from './employee-health-insurance.service';
import { EmployeeCertificationsService, type EmployeeCertificationResponse } from './employee-certifications.service';
type ProfileAddress = {
    line1: string;
    line2: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
};
type EmergencyContactEntry = {
    fullName: string;
    relationship: string;
    phoneNumber: string;
    email: string;
    isPrimary: boolean;
};
export type MyFullProfileResponse = {
    linked: false;
} | {
    linked: true;
    visibility: 'full' | 'limited';
    identity: {
        contactId: number;
        contactInfoId: number;
        contactAssignmentId: number;
    };
    basics: {
        firstName: string;
        middleName: string;
        lastName: string;
        email: string;
        personalEmail: string;
        cellPhone: string;
        workPhone: string;
        department: string;
        role: string;
        company: string;
    };
    personal: {
        dateOfBirth: string | null;
        age: number | null;
        gender: string;
        maritalStatus: string;
        ethnicity: string;
        ssnLast4: string;
    };
    homeAddress: ProfileAddress | null;
    emergencyContacts: EmergencyContactEntry[];
    employment: {
        title: string;
        office: string;
        accessLevel: string;
        workAuthorization: string;
        startDate: string | null;
        yearsOfService: string;
        hireDate: string | null;
        terminationDate: string | null;
        employmentStatus: string;
        employmentType: string;
        payType: string;
        payRate: string;
        supervisor: string;
        ptoAccrualRate: string;
        employmentAgreement: string;
        rampAccount: string;
        rampCreditCard: string;
        workstation: string;
    };
    officeAddress: ProfileAddress | null;
    equipment: {
        deskPhoneNumber: string;
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
    entra: {
        microsoftOfficeLicenses: string[];
        microsoftGroups: string[];
    };
    healthInsurance: EmployeeHealthInsuranceResponse | null;
    experience: EmployeeExperienceResponse | null;
    certifications: EmployeeCertificationResponse | null;
};
export declare class SelfProfileService {
    private readonly dataSource;
    private readonly auditContext;
    private readonly healthInsuranceService;
    private readonly experienceService;
    private readonly certificationsService;
    private readonly adminUsersService;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext, healthInsuranceService: EmployeeHealthInsuranceService, experienceService: EmployeeExperienceService, certificationsService: EmployeeCertificationsService, adminUsersService: AdminUsersService);
    getMyFullProfile(): Promise<MyFullProfileResponse>;
    getEmployeeProfileForViewer(targetContactId: number): Promise<MyFullProfileResponse>;
    private buildFullProfile;
    private applyVisibility;
    private isAccessLevelAdmin;
    private safe;
    private loadEntraJobInfo;
    private signedInEmailCandidates;
    private resolveInternalContact;
    private resolveInternalContactById;
    private resolveContactByWhere;
    private loadAddress;
    private loadEmergencyContacts;
    private loadEquipment;
    private tableExists;
}
export {};
