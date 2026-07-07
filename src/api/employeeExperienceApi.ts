import { apiFetch } from './config';

export interface EmployeeExperience {
  contactId: number;
  engagementsAssignedTo: string[];
  engagementsWorkedOn: string[];
  marketsWorkedIn: string[];
}

export function fetchEmployeeExperience(
  email: string,
): Promise<EmployeeExperience> {
  return apiFetch<EmployeeExperience>(
    `/admin/users/${encodeURIComponent(email)}/experience`,
  );
}
