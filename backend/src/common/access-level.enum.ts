/**
 * System-wide access levels.
 *
 * If a logged-in user has no EmployeeProfile row or no Contact in the EMS
 * contacts table, they default to "Employee".
 */
export enum AccessLevel {
  Employee = 'Employee',
  Administrator = 'Administrator',
  SuperAdmin = 'Super Admin',
}

/** Ordered from least to most privileged. */
export const ACCESS_LEVEL_HIERARCHY: AccessLevel[] = [
  AccessLevel.Employee,
  AccessLevel.Administrator,
  AccessLevel.SuperAdmin,
];

/** Returns true if `userLevel` meets or exceeds `requiredLevel`. */
export function meetsAccessLevel(
  userLevel: AccessLevel,
  requiredLevel: AccessLevel,
): boolean {
  const userIdx = ACCESS_LEVEL_HIERARCHY.indexOf(userLevel);
  const requiredIdx = ACCESS_LEVEL_HIERARCHY.indexOf(requiredLevel);
  return userIdx >= requiredIdx;
}
