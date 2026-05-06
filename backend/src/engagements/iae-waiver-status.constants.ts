/**
 * Allowed values for dbo.EngagementFinances.IAEApplicationWaiverStatus (nvarchar(50), nullable).
 * The column is a free string in the DB; the UI constrains to this list. Override with env
 * IAE_WAIVER_STATUS_OPTIONS=Pending,Submitted,Approved (comma-separated) if needed.
 */
const DEFAULT = [
  'Pending',
  'Submitted',
  'In review',
  'Approved',
  'Rejected',
  'Withdrawn',
  'N/A',
] as const;

function parseEnv(): string[] {
  const raw = process.env.IAE_WAIVER_STATUS_OPTIONS?.trim();
  if (!raw) return [...DEFAULT];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getIaeWaiverStatusAllowlist(): string[] {
  const v = parseEnv();
  return v.length > 0 ? v : [...DEFAULT];
}
