import { apiFetch } from './config';

export type AccessLevel = 'Employee' | 'Administrator' | 'Super Admin';

export interface MyAccessLevelResponse {
  accessLevel: AccessLevel;
}

export function fetchMyAccessLevel(): Promise<MyAccessLevelResponse> {
  return apiFetch<MyAccessLevelResponse>('/admin/me/access-level');
}
// test comment