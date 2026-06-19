import { apiFetch } from './config';

export interface MyProfile {
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  workPhone: string;
  departmentName: string;
  roleNames: string[];
  jobTitle: string;
  jobTitleColumnAvailable: boolean;
  entraSyncWarnings?: string[];
}

export interface UpdateMyProfileRequest {
  firstName: string;
  lastName: string;
  cellPhone: string;
  workPhone: string;
  departmentName: string;
  jobTitle?: string;
}

export function fetchMyProfile(): Promise<MyProfile> {
  return apiFetch<MyProfile>('/admin/me/profile');
}

export function updateMyProfile(
  request: UpdateMyProfileRequest,
): Promise<MyProfile> {
  return apiFetch<MyProfile>('/admin/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(request),
  });
}
