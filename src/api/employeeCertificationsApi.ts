import { apiFetch } from './config';

export interface EmployeeCertification {
  submissionId: number;
  certificationName: string;
  issuingOrganization: string;
  platformName: string;
  dateCompleted: string | null;
  pointsAwarded: number;
  credentialUrl: string;
  tags: string[];
}

export interface EmployeeCertificationsResponse {
  certifications: EmployeeCertification[];
}

export function fetchEmployeeCertifications(
  email: string,
): Promise<EmployeeCertificationsResponse> {
  return apiFetch<EmployeeCertificationsResponse>(
    `/admin/users/${encodeURIComponent(email)}/certifications`,
  );
}
