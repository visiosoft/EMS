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

export interface SelfProfileHealthInsurance {
  insuranceType: string;
  optInStatus: string;
  planName: string;
  planType: string;
  additionalInsureds: string;
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
    gender: string;
    maritalStatus: string;
    ethnicity: string;
    ssnLast4: string;
  };
  homeAddress: SelfProfileAddress | null;
  emergencyContacts: SelfProfileEmergencyContact[];
  employment: {
    accessLevel: string;
    workAuthorization: string;
    startDate: string | null;
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
  healthInsurance: SelfProfileHealthInsurance[];
}

export type SelfProfile = LinkedSelfProfile | { linked: false };

export function fetchMySelfProfile(): Promise<SelfProfile> {
  return apiFetch<SelfProfile>('/internal/my-profile');
}
