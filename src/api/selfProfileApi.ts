import { apiFetch } from './config';

export interface SelfProfileAddress {
  line1: string;
  line2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export interface SelfProfileEmergencyContact {
  fullName: string;
  relationship: string;
  phoneNumber: string;
  email: string;
  isPrimary: boolean;
}

export interface SelfProfileInsuranceElection {
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

export interface SelfProfileHealthInsurance {
  contactId: number;
  insuranceEligibility: string;
  tenureTier: '<1 yr' | '1+ yr' | null;
  companyContributionPerPayPeriod: number;
  elections: SelfProfileInsuranceElection[];
}

export interface SelfProfileExperience {
  contactId: number;
  engagementsAssignedTo: string[];
  engagementsWorkedOn: string[];
  marketsWorkedIn: string[];
}

export interface LinkedSelfProfile {
  linked: true;
  identity: {
    contactId: number;
    contactInfoId: number;
    contactAssignmentId: number;
  };
  basics: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    personalEmail: string;
    cellPhone: string;
    workPhone: string;
    department: string;
    role: string;
    company: string;
  };
  personal: {
    dateOfBirth: string | null;
    age: number | null;
    gender: string;
    maritalStatus: string;
    ethnicity: string;
    ssnLast4: string;
  };
  homeAddress: SelfProfileAddress | null;
  emergencyContacts: SelfProfileEmergencyContact[];
  employment: {
    title: string;
    office: string;
    accessLevel: string;
    workAuthorization: string;
    startDate: string | null;
    yearsOfService: string;
    hireDate: string | null;
    terminationDate: string | null;
    employmentStatus: string;
    employmentType: string;
    payType: string;
    payRate: string;
    supervisor: string;
    ptoAccrualRate: string;
    employmentAgreement: string;
    rampAccount: string;
    rampCreditCard: string;
    workstation: string;
  };
  officeAddress: SelfProfileAddress | null;
  equipment: {
    deskPhoneNumber: string;
    deskPhoneExtension: string;
    deskPhoneMac: string;
    deskPhoneBrand: string;
    deskPhoneModel: string;
    pcBrand: string;
    pcModel: string;
    pcServiceTag: string;
    bluetoothStatus: string;
    pcWindowsName: string;
  };
  entra: {
    microsoftOfficeLicenses: string[];
    microsoftGroups: string[];
  };
  healthInsurance: SelfProfileHealthInsurance | null;
  experience: SelfProfileExperience | null;
}

export type SelfProfile = LinkedSelfProfile | { linked: false };

export function fetchMySelfProfile(): Promise<SelfProfile> {
  return apiFetch<SelfProfile>('/internal/my-profile');
}
