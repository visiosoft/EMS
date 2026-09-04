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
export type HealthPlanContributionRuleInfo = {
    tenureTier: string;
    employerContributionPct: number;
};
export type HealthPlanOption = {
    healthPlanId: number;
    planName: string;
    planType: string;
    carrierName: string;
    planCode: string | null;
    benefits: string[];
    pricing: HealthPlanPricingInfo[];
    contributionRules: HealthPlanContributionRuleInfo[];
};
export type EmployeeHealthInsuranceResponse = {
    contactId: number;
    insuranceEligibility: string;
    tenureTier: '<1 yr' | '1+ yr' | null;
    companyContributionPerPayPeriod: number;
    benchmarkBiweekly: number;
    elections: InsuranceElection[];
    plans: HealthPlanOption[];
};
export declare class UpdateEmployeeHealthInsuranceDto {
    insuranceType: string;
    optInStatus?: string | null;
    healthPlanId?: number | null;
    additionalInsureds?: string | null;
}
export declare class BulkUpdateHealthInsuranceDto {
    medical?: {
        optInStatus?: string | null;
        healthPlanId?: number | null;
        additionalInsureds?: string | null;
    };
    dental?: {
        optInStatus?: string | null;
        healthPlanId?: number | null;
        additionalInsureds?: string | null;
    };
    vision?: {
        optInStatus?: string | null;
        healthPlanId?: number | null;
        additionalInsureds?: string | null;
    };
}
export declare class EmployeeHealthInsuranceService {
    private readonly dataSource;
    private readonly auditContext;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    getHealthInsurance(userEmail: string): Promise<EmployeeHealthInsuranceResponse>;
    getHealthInsuranceByContactId(contactId: number): Promise<EmployeeHealthInsuranceResponse>;
    updateHealthInsurance(userEmail: string, dto: UpdateEmployeeHealthInsuranceDto): Promise<EmployeeHealthInsuranceResponse>;
    bulkUpdateHealthInsurance(userEmail: string, dto: BulkUpdateHealthInsuranceDto): Promise<EmployeeHealthInsuranceResponse>;
    private resolveContactIdByEmail;
    private loadHealthInsuranceForContact;
    recalculateDeductionsForContact(contactId: number): Promise<void>;
    private tableExists;
}
