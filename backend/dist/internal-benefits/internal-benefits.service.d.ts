import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export type BenefitPlanPricingRow = {
    coverageType: string;
    monthlyPremium: number;
};
export type BenefitPlanRow = {
    healthPlanId: number;
    planName: string;
    planType: string;
    benefits: string[];
    pricing: BenefitPlanPricingRow[];
};
export type MyInsuranceElection = {
    insuranceType: string;
    optInStatus: string | null;
    additionalInsureds: string | null;
    healthPlanId: number | null;
    planName: string | null;
    monthlyPremium: number | null;
    pricing: BenefitPlanPricingRow[];
};
export type MyInsuranceResponse = {
    noProfile: boolean;
    startDate: string | null;
    elections: MyInsuranceElection[];
};
export declare class InternalBenefitsService {
    private readonly dataSource;
    private readonly auditContext;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    private resolveContactIdForSignedInUser;
    private loadCurrentPricing;
    private matchPremium;
    getMyInsurance(): Promise<MyInsuranceResponse>;
    listPlans(): Promise<BenefitPlanRow[]>;
}
