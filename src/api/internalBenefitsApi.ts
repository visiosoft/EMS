import { apiFetch } from '@/api/config';

export type BenefitPlanPricing = {
  coverageType: string;
  monthlyPremium: number;
};

export type BenefitPlan = {
  healthPlanId: number;
  planName: string;
  planType: string;
  benefits: string[];
  pricing: BenefitPlanPricing[];
};

export type MyInsuranceElection = {
  insuranceType: string;
  optInStatus: string | null;
  additionalInsureds: string | null;
  healthPlanId: number | null;
  planName: string | null;
  monthlyPremium: number | null;
  pricing: BenefitPlanPricing[];
};

export type MyInsuranceResponse = {
  noProfile: boolean;
  startDate: string | null;
  elections: MyInsuranceElection[];
};

export function fetchMyInsurance(): Promise<MyInsuranceResponse> {
  return apiFetch<MyInsuranceResponse>('/internal/benefits/my-insurance');
}

export function fetchBenefitPlans(): Promise<BenefitPlan[]> {
  return apiFetch<BenefitPlan[]>('/internal/benefits/plans');
}
