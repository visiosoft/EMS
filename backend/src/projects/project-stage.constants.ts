/**
 * Allowed values for `dbo.EngagementProject.OfferCreationStatus`
 * (column formerly named `ProjectStage`). Aligned with DB CHECK constraint.
 */
export const PROJECT_STAGE_VALUES = [
  'Requested',
  'Drafted',
  'Submitted',
] as const;
export type ProjectStageValue = (typeof PROJECT_STAGE_VALUES)[number];

export function isAllowedProjectStage(v: string): v is ProjectStageValue {
  return (PROJECT_STAGE_VALUES as readonly string[]).includes(v);
}

/**
 * Allowed values for `dbo.EngagementProject.OfferReviewStatus` (new column).
 * Only applicable once an offer is Submitted (OfferCreationStatus = 'Submitted').
 */
export const OFFER_REVIEW_STATUS_VALUES = [
  'In Consideration',
  'Declined',
  'Confirmed',
] as const;
export type OfferReviewStatusValue =
  (typeof OFFER_REVIEW_STATUS_VALUES)[number];

export function isAllowedOfferReviewStatus(
  v: string,
): v is OfferReviewStatusValue {
  return (OFFER_REVIEW_STATUS_VALUES as readonly string[]).includes(v);
}

/**
 * The OfferReviewStatus value that triggers project → engagement conversion.
 * (Previously conversion keyed off ProjectStage = 'Confirmed'; the 'Confirmed'
 * value moved to OfferReviewStatus as part of the offer-workflow schema change.)
 */
export const PROJECT_CONVERSION_REVIEW_STATUS: OfferReviewStatusValue =
  'Confirmed';

export function isProjectConversionReview(
  v: string | null | undefined,
): boolean {
  return v != null && v === PROJECT_CONVERSION_REVIEW_STATUS;
}

/**
 * Allowed values for `dbo.Performance.TicketingStatus`
 * (column formerly named `PerformanceStatus`).
 */
export const PERFORMANCE_TICKETING_STATUS_VALUES = [
  'Private (Not Announced)',
  'Public (Not On Sale)',
  'Public (On-Sale)',
  'Public (Season Ticket Sales Only)',
] as const;
export type PerformanceTicketingStatusValue =
  (typeof PERFORMANCE_TICKETING_STATUS_VALUES)[number];

export function isAllowedPerformanceTicketingStatus(
  v: string,
): v is PerformanceTicketingStatusValue {
  return (PERFORMANCE_TICKETING_STATUS_VALUES as readonly string[]).includes(v);
}

/** True for any of the "Public ..." ticketing statuses. */
export function isPublicTicketingStatus(v: string | null | undefined): boolean {
  if (!v) return false;
  return v.trim().toLowerCase().startsWith('public');
}

/** Canonical default public ticketing status (used when copying/ defaulting). */
export const DEFAULT_PUBLIC_TICKETING_STATUS: PerformanceTicketingStatusValue =
  'Public (Not On Sale)';

/** Canonical default private ticketing status (used when copying/ defaulting). */
export const DEFAULT_PRIVATE_TICKETING_STATUS: PerformanceTicketingStatusValue =
  'Private (Not Announced)';
