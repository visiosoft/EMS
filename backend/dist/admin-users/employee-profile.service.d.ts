import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export type EmployeePersonalProfileResponse = {
    contactId: number;
    contactInfoId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string;
    middleName: string;
    personalEmail: string;
    birthDate: string | null;
    ssn: string;
    homeAddressId: number | null;
    homeStreet: string;
    homeAddress2: string;
    homeCity: string;
    homeState: string;
    homePostalCode: string;
    homeCountry: string;
    emergencyContactId: number | null;
    emergencyFirstName: string;
    emergencyLastName: string;
    emergencyEmail: string;
    emergencyCellPhone: string;
};
export declare class UpdateEmployeePersonalProfileDto {
    middleName?: string | null;
    personalEmail?: string | null;
    birthDate?: string | null;
    ssn?: string | null;
    homeStreet?: string | null;
    homeAddress2?: string | null;
    homeCity?: string | null;
    homeState?: string | null;
    homePostalCode?: string | null;
    homeCountry?: string | null;
    emergencyFirstName?: string | null;
    emergencyLastName?: string | null;
    emergencyEmail?: string | null;
    emergencyCellPhone?: string | null;
}
export declare class EmployeeProfileService {
    private readonly dataSource;
    private readonly auditContext;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    getPersonalProfile(userEmail: string): Promise<EmployeePersonalProfileResponse>;
    updatePersonalProfile(userEmail: string, dto: UpdateEmployeePersonalProfileDto): Promise<EmployeePersonalProfileResponse>;
    private loadPersonalProfile;
    private tableExists;
}
