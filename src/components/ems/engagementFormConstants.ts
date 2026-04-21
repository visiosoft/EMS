/**
 * Engagement status values.
 * Items 1-3 are the primary statuses used in the UI filters.
 * Full DB enum is kept for reading legacy records.
 */
export const ENGAGEMENT_STATUS_ENUM = [
  'Public',
  'Private',
  'Unknown',
] as const;

/** Full DB values (used for display of existing records) */
export const ENGAGEMENT_STATUS_ALL = [
  'Public',
  'Private',
  'Unknown',
  'Draft',
  'Confirmed',
  'OnSale',
  'Settled',
  'Closed',
  'Cancelled',
  'Dead',
] as const;

export type EngagementStatusEnum = (typeof ENGAGEMENT_STATUS_ALL)[number];
