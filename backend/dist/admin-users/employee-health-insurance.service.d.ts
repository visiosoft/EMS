import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export type InsuranceElection = {
    insuranceType: string;
    optInStatus: string;
    healthPlanId: number | null;
    planName: string;
    additionalInsureds: string;
    planPrice: string;
    planBenefits: string;
    monthlyRate: string;
    payrollDeduction: string;
};
export type HealthPlanPricingInfo = {
    coverageType: string;
    monthlyPremium: number;
};
export type HealthPlanOption = {
    healthPlanId: number;
    planName: string;
    planType: string;
    benefits: string[];
    pricing: HealthPlanPricingInfo[];
};
export type EmployeeHealthInsuranceResponse = {
    contactId: number;
    insuranceEligibility: string;
    tenureTier: '<1 yr' | '1+ yr' | null;
    companyContributionPerPayPeriod: number;
    elections: InsuranceElection[];
    plans: HealthPlanOption[];
};
export declare class UpdateEmployeeHealthInsuranceDto {
    insuranceType: string;
    optInStatus?: string | null;
    healthPlanId?: number | null;
    additionalInsureds?: string | null;
}
export declare class EmployeeHealthInsuranceService {
    private readonly dataSource;
    private readonly auditContext;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    getHealthInsurance(userEmail: string): Promise<EmployeeHealthInsuranceResponse>;
    updateHealthInsurance(userEmail: string, dto: UpdateEmployeeHealthInsuranceDto): Promise<EmployeeHealthInsuranceResponse>;
    private loadHealthInsurance;
    private tableExists;
}
