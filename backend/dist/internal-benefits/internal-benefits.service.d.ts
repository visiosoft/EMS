import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export type TenureTier = '<1 yr' | '1+ yr';
export type BenefitPlanPricingRow = {
    coverageType: string;
    monthlyPremium: number;
};
export type BenefitPlanContributionRow = {
    tenureTier: string;
    employerContributionPct: number;
};
export type BenefitPlanRow = {
    healthPlanId: number;
    planName: string;
    planType: string;
    carrierName: string;
    planCode: string | null;
    pricing: BenefitPlanPricingRow[];
    contributionRules: BenefitPlanContributionRow[];
};
export type MyInsuranceElection = {
    insuranceType: string;
    optInStatus: string | null;
    coverageTier: string | null;
    healthPlanId: number | null;
    planName: string | null;
    carrierName: string | null;
    monthlyPremium: number | null;
    deductionPerPayPeriod: number | null;
    employerContributionPct: number | null;
    employerContributionPerPayPeriod: number | null;
    pricing: BenefitPlanPricingRow[];
};
export type MyInsuranceResponse = {
    noProfile: boolean;
    tenureTier: TenureTier | null;
    elections: MyInsuranceElection[];
};
export declare class InternalBenefitsService {
    private readonly dataSource;
    private readonly auditContext;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    private resolveContactIdForSignedInUser;
    private loadCurrentPricing;
    private loadContributionRules;
    private matchPremium;
    private static buildAlternateTiers;
    private static readonly TYPE_COLUMNS;
    getMyInsurance(): Promise<MyInsuranceResponse>;
    private loadPlanDetails;
    listPlans(): Promise<BenefitPlanRow[]>;
}
