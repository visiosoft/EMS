/** Allowed values for `dbo.EngagementProject.ProjectStage` (aligned with DB CHECK). */
export const PROJECT_STAGE_VALUES = [
  'Under Construction',
  'Pending',
  'Confirmed',
  'Inactive',
] as const;
export type ProjectStageValue = (typeof PROJECT_STAGE_VALUES)[number];

export function isAllowedProjectStage(v: string): v is ProjectStageValue {
  return (PROJECT_STAGE_VALUES as readonly string[]).includes(v);
}

export const PROJECT_CONVERSION_STAGE: ProjectStageValue = 'Confirmed';

export function isProjectConversionStage(v: string): boolean {
  return v === PROJECT_CONVERSION_STAGE;
}
