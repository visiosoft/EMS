import { apiFetch } from './config';

export interface WorkstationOption {
  workLocationId: number;
  locationCode: string;
  officeCode: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
}

export interface WorkstationListResponse {
  offices: {
    officeCode: string;
    workstations: WorkstationOption[];
  }[];
}

export interface EmployeeEmploymentProfile {
  contactId: number;
  contactAssignmentId: number;
  accessLevel: string;
  workAuthorization: string;
  workstation: string;
  startDate: string | null;
  supervisor: string;
  ptoAccrualRate: string;
  employmentAgreement: string;
  rampAccount: string;
  rampCreditCard: string;
  officeAddressId: number | null;
  officeStreet: string;
  officeAddress2: string;
  officeCity: string;
  officeState: string;
  officePostalCode: string;
  officeCountry: string;
  deskPhoneExtension: string;
  deskPhoneMac: string;
  deskPhoneBrand: string;
  deskPhoneModel: string;
  pcBrand: string;
  pcModel: string;
  pcServiceTag: string;
  bluetoothStatus: string;
  pcWindowsName: string;
}

export interface UpdateEmployeeEmploymentProfileRequest {
  accessLevel?: string | null;
  workAuthorization?: string | null;
  workstation?: string | null;
  startDate?: string | null;
  supervisor?: string | null;
  ptoAccrualRate?: string | null;
  employmentAgreement?: string | null;
  rampAccount?: string | null;
  rampCreditCard?: string | null;
  officeStreet?: string | null;
  officeAddress2?: string | null;
  officeCity?: string | null;
  officeState?: string | null;
  officePostalCode?: string | null;
  officeCountry?: string | null;
  /** Equipment assignment fields */
  deskPhoneExtensionId?: number | null;
  deskPhoneId?: number | null;
  pcComputerId?: number | null;
}

export function fetchEmployeeEmploymentProfile(
  email: string,
): Promise<EmployeeEmploymentProfile> {
  return apiFetch<EmployeeEmploymentProfile>(
    `/admin/users/${encodeURIComponent(email)}/employment-profile`,
  );
}

export function updateEmployeeEmploymentProfile(
  email: string,
  request: UpdateEmployeeEmploymentProfileRequest,
): Promise<EmployeeEmploymentProfile> {
  return apiFetch<EmployeeEmploymentProfile>(
    `/admin/users/${encodeURIComponent(email)}/employment-profile`,
    {
      method: 'PATCH',
      body: JSON.stringify(request),
    },
  );
}

export function fetchWorkstations(): Promise<WorkstationListResponse> {
  return apiFetch<WorkstationListResponse>('/admin/workstations');
}

export interface PhoneExtensionOption {
  extensionId: number;
  extensionNumber: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
}

export interface PhoneExtensionListResponse {
  extensions: PhoneExtensionOption[];
}

export function fetchPhoneExtensions(): Promise<PhoneExtensionListResponse> {
  return apiFetch<PhoneExtensionListResponse>('/admin/phone-extensions');
}

export interface PhoneDeviceOption {
  phoneId: number;
  macAddress: string;
  make: string;
  model: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
}

export interface PhoneDeviceListResponse {
  phones: PhoneDeviceOption[];
}

export function fetchPhoneDevices(): Promise<PhoneDeviceListResponse> {
  return apiFetch<PhoneDeviceListResponse>('/admin/phone-devices');
}

export interface PcDeviceOption {
  computerId: number;
  pcName: string;
  make: string;
  model: string;
  serviceTag: string;
  bluetoothStatus: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
}

export interface PcDeviceListResponse {
  computers: PcDeviceOption[];
}

export function fetchPcDevices(): Promise<PcDeviceListResponse> {
  return apiFetch<PcDeviceListResponse>('/admin/pc-devices');
}

export function fetchUserLicenses(email: string): Promise<string[]> {
  return apiFetch<string[]>(
    `/admin/users/${encodeURIComponent(email)}/licenses`,
  );
}

export function fetchUserGroups(email: string): Promise<string[]> {
  return apiFetch<string[]>(
    `/admin/users/${encodeURIComponent(email)}/groups`,
  );
}
