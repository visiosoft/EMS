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

export interface HealthPlanAgeRateInfo {
  ageMin: number;
  ageMax: number;
  monthlyRate: number;
}

export interface HealthPlanOption {
  healthPlanId: number;
  planName: string;
  planType: string;
  benefits: string[];
  pricing: HealthPlanPricingInfo[];
  ageRates: HealthPlanAgeRateInfo[];
}

export interface EmployeeHealthInsurance {
  contactId: number;
  employeeAge: number | null;
  insuranceEligibility: string;
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
