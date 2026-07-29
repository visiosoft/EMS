import { DataSource } from 'typeorm';
export type EmployeeExperienceResponse = {
    contactId: number;
    engagementsAssignedTo: string[];
    engagementsWorkedOn: string[];
    marketsWorkedIn: string[];
};
export declare class EmployeeExperienceService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getExperience(userEmail: string): Promise<EmployeeExperienceResponse>;
}
