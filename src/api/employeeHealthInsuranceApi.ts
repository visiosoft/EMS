import { apiFetch } from './config';

export interface InsuranceElection {
  insuranceType: string;
  optInStatus: string;
  healthPlanId: number | null;
  planName: string;
  additionalInsureds: string;
  planPrice: string;
  planBenefits: string;
  monthlyRate: string;
  payrollDeduction: string;
}

export interface HealthPlanPricingInfo {
  coverageType: string;
  monthlyPremium: number;
}

export interface HealthPlanContributionRuleInfo {
  tenureTier: string;
  employerContributionPct: number;
}

export interface HealthPlanOption {
  healthPlanId: number;
  planName: string;
  planType: string;
  carrierName: string;
  planCode: string | null;
  benefits: string[];
  pricing: HealthPlanPricingInfo[];
  contributionRules: HealthPlanContributionRuleInfo[];
}

export interface EmployeeHealthInsurance {
  contactId: number;
  insuranceEligibility: string;
  tenureTier: '<1 yr' | '1+ yr' | null;
  companyContributionPerPayPeriod: number;
  benchmarkBiweekly: number;
  elections: InsuranceElection[];
  plans: HealthPlanOption[];
}

export interface UpdateEmployeeHealthInsuranceRequest {
  insuranceType: string;
  optInStatus?: string | null;
  healthPlanId?: number | null;
  additionalInsureds?: string | null;
}

export function fetchEmployeeHealthInsurance(
  email: string,
): Promise<EmployeeHealthInsurance> {
  return apiFetch<EmployeeHealthInsurance>(
    `/admin/users/${encodeURIComponent(email)}/health-insurance`,
  );
}

export function updateEmployeeHealthInsurance(
  email: string,
  request: UpdateEmployeeHealthInsuranceRequest,
): Promise<EmployeeHealthInsurance> {
  return apiFetch<EmployeeHealthInsurance>(
    `/admin/users/${encodeURIComponent(email)}/health-insurance`,
    {
      method: 'PATCH',
      body: JSON.stringify(request),
    },
  );
}
