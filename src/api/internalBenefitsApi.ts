import { apiFetch } from '@/api/config';

export type TenureTier = '<1 yr' | '1+ yr';

export type BenefitPlanPricing = {
  coverageType: string;
  monthlyPremium: number;
};

export type BenefitPlanContribution = {
  tenureTier: string;
  employerContributionPct: number;
};

export type BenefitPlan = {
  healthPlanId: number;
  planName: string;
  planType: string;
  carrierName: string;
  planCode: string | null;
  pricing: BenefitPlanPricing[];
  contributionRules: BenefitPlanContribution[];
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
  pricing: BenefitPlanPricing[];
};

export type MyInsuranceResponse = {
  noProfile: boolean;
  tenureTier: TenureTier | null;
  elections: MyInsuranceElection[];
};

export function fetchMyInsurance(): Promise<MyInsuranceResponse> {
  return apiFetch<MyInsuranceResponse>('/internal/benefits/my-insurance');
}

export function fetchBenefitPlans(): Promise<BenefitPlan[]> {
  return apiFetch<BenefitPlan[]>('/internal/benefits/plans');
}
