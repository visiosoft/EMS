import { DataSource } from 'typeorm';
export interface EmployeeCertificationResponse {
    certifications: {
        submissionId: number;
        certificationName: string;
        issuingOrganization: string;
        platformName: string;
        dateCompleted: string | null;
        pointsAwarded: number;
        credentialUrl: string;
        tags: string[];
    }[];
}
export declare class EmployeeCertificationsService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getCertifications(userEmail: string): Promise<EmployeeCertificationResponse>;
}
