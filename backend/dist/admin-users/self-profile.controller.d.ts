import { EntraProfileSyncService } from './entra-profile-sync.service';
import { SelfProfileService } from './self-profile.service';
export declare class SelfProfileController {
    private readonly selfProfileService;
    private readonly entraProfileSyncService;
    constructor(selfProfileService: SelfProfileService, entraProfileSyncService: EntraProfileSyncService);
    getMyProfile(): Promise<import("./self-profile.service").MyFullProfileResponse>;
    getEmployeeProfile(contactId: number): Promise<import("./self-profile.service").MyFullProfileResponse>;
    previewSyncFromEntra(graphAccessToken?: string): Promise<{
        changes: import("./entra-profile-sync.service").EntraProfileSyncFieldChange[];
    }>;
    debugEntraCsa(email: string): Promise<{
        user: {
            id: string;
            displayName: string;
            givenName: string;
            surname: string;
            mail: string;
            userPrincipalName: string;
            mobilePhone: string;
            businessPhones: string[];
            department: string;
            jobTitle: string;
            officeLocation: string;
            companyName: string;
            employeeType: string;
            accountEnabled: boolean;
            employeeHireDate: string | null;
            streetAddress: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
        };
        manager: {
            displayName: string;
            email: string;
        } | null;
        emsAttributes: {
            MiddleName?: string | null;
            PersonalEmail?: string | null;
            Birthday?: string | null;
            SocialSecurityNumber?: string | null;
            EmergencyContactFirstName?: string | null;
            EmergencyContactLastName?: string | null;
            EmergencyContactCell?: string | null;
            EmergencyContactEmail?: string | null;
            WorkAuthorization?: string | null;
            WorthAuthorizationLink?: string | string[] | null;
            Workstation?: string | null;
            PTOAccrual?: string | null;
            EmploymentAgreement?: string | boolean | null;
            RampAccount?: string | boolean | null;
            RampCard?: string | null;
            DeskPhoneNumber?: string | null;
            DeskPhoneExtension?: string | null;
            DeskPhoneMAC?: string | null;
            DeskPhoneBrand?: string | null;
            DeskPhoneModel?: string | null;
            PCServiceTag?: string | null;
            PCBrand?: string | null;
            PCModel?: string | null;
            BluetoothStatus?: string | null;
            PCWindowsName?: string | null;
            PCDeviceType?: string | null;
            PCNotes?: string | null;
            PCEquipmentStatus?: string | null;
            PCIsManagedByIT?: boolean | string | null;
            EMSAccessLevel?: string | null;
            Supervisor?: string | null;
            DepartmentRank?: number | string | null;
            Department2?: string | null;
            HomeAddressStreet1?: string | null;
            HomeAddressCity?: string | null;
            HomeAddressState?: string | null;
            HomeAddressZip?: string | null;
            HomeAddressCountry?: string | null;
            HomeAddressStreet2?: string | null;
            OfficeAddressStreet1?: string | null;
            OfficeAddressStreet2?: string | null;
            OfficeAddressCity?: string | null;
            OfficeAddressState?: string | null;
            OfficeAddressZip?: string | null;
            OfficeAddressCountry?: string | null;
            Role?: string | null;
        };
    } | {
        error: string;
    }>;
    syncMyProfileFromEntra(graphAccessToken?: string): Promise<{
        synced: boolean;
        changes: import("./entra-profile-sync.service").EntraProfileSyncFieldChange[];
    }>;
    applySelectedSync(body: {
        fields: string[];
    }, graphAccessToken?: string): Promise<{
        synced: boolean;
        changes: import("./entra-profile-sync.service").EntraProfileSyncFieldChange[];
    }>;
    updateMyProfile(body: UpdateMyProfileDto): Promise<import("./self-profile.service").ProfileUpdateResult>;
    updateEmployeeProfile(contactId: number, body: UpdateMyProfileDto): Promise<import("./self-profile.service").ProfileUpdateResult>;
}
export interface UpdateMyProfileDto {
    cellPhone?: string;
    workPhone?: string;
    homeAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        stateProvince?: string;
        postalCode?: string;
        country?: string;
    };
    emergencyContacts?: {
        fullName: string;
        phoneNumber: string;
        email: string;
        isPrimary: boolean;
    }[];
    workstation?: string;
    workAuthorizationLinkUrl?: string;
    deskPhoneExtensionId?: number | null;
    deskPhoneId?: number | null;
    pcComputerId?: number | null;
}
