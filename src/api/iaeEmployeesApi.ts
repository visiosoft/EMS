import { apiFetch } from '@/api/config';

export type IaeEmployee = {
  contactId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  workPhone: string | null;
  roleName: string | null;
};

export function fetchIaeStaffEmployees(): Promise<IaeEmployee[]> {
  return apiFetch<IaeEmployee[]>('/internal/iae-employees');
}
