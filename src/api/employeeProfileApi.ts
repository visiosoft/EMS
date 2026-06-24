import { apiFetch } from './config';

export interface EmployeePersonalProfile {
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  middleName: string;
  personalEmail: string;
  birthDate: string | null;
  ssn: string;
  homeAddressId: number | null;
  homeStreet: string;
  homeAddress2: string;
  homeCity: string;
  homeState: string;
  homePostalCode: string;
  homeCountry: string;
  emergencyContactId: number | null;
  emergencyFirstName: string;
  emergencyLastName: string;
  emergencyEmail: string;
  emergencyCellPhone: string;
}

export interface UpdateEmployeePersonalProfileRequest {
  middleName?: string | null;
  personalEmail?: string | null;
  birthDate?: string | null;
  ssn?: string | null;
  homeStreet?: string | null;
  homeAddress2?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  homePostalCode?: string | null;
  homeCountry?: string | null;
  emergencyFirstName?: string | null;
  emergencyLastName?: string | null;
  emergencyEmail?: string | null;
  emergencyCellPhone?: string | null;
}

export function fetchEmployeePersonalProfile(
  email: string,
): Promise<EmployeePersonalProfile> {
  return apiFetch<EmployeePersonalProfile>(
    `/admin/users/${encodeURIComponent(email)}/personal-profile`,
  );
}

export function updateEmployeePersonalProfile(
  email: string,
  request: UpdateEmployeePersonalProfileRequest,
): Promise<EmployeePersonalProfile> {
  return apiFetch<EmployeePersonalProfile>(
    `/admin/users/${encodeURIComponent(email)}/personal-profile`,
    {
      method: 'PATCH',
      body: JSON.stringify(request),
    },
  );
}
