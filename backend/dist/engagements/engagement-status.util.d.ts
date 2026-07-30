export declare const ENGAGEMENT_STATUS_VALUES: readonly ["Unknown", "Private", "Public", "Confirmed"];
export type EngagementStatusCanonical = (typeof ENGAGEMENT_STATUS_VALUES)[number];
export declare function normalizeEngagementStatus(raw: string): EngagementStatusCanonical;
