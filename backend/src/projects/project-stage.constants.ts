/** Allowed values for `dbo.EngagementProject.ProjectStage` (aligned with DB CHECK). */
export const PROJECT_STAGE_VALUES = [
  'Under Construction',
  'Pending',
  'Inactive',
] as const;
export type ProjectStageValue = (typeof PROJECT_STAGE_VALUES)[number];

export function isAllowedProjectStage(v: string): v is ProjectStageValue {
  return (PROJECT_STAGE_VALUES as readonly string[]).includes(v);
}

/**
 * Temporary conversion trigger until the database allows `Confirmed` as the
 * finalized project stage. Change this value when that DB constraint is ready.
 */
export const PROJECT_CONVERSION_STAGE: ProjectStageValue = 'Inactive';

export function isProjectConversionStage(v: string): boolean {
  return v === PROJECT_CONVERSION_STAGE;
}
