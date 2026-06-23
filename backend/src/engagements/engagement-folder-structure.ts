/**
 * Predefined folder hierarchy created under each engagement's SharePoint folder.
 *
 * Structure:
 *   {Year} / {Market (DMA)} / {Attraction} /
 *     Contracts/  → Tour, Venue, Partner
 *     Booking/    → Tour, Venue
 *     Ticketing/
 *     Marketing/
 *     Advance/    → Tour, Venue
 *     Settlement/ → Tour, Venue, Partner
 */

export const ENGAGEMENT_FOLDER_STRUCTURE: Record<string, string[]> = {
  Contracts: ['Tour', 'Venue', 'Partner'],
  Booking: ['Tour', 'Venue'],
  Ticketing: [],
  Marketing: [],
  Advance: ['Tour', 'Venue'],
  Settlement: ['Tour', 'Venue', 'Partner'],
};

/** Characters disallowed in SharePoint folder names */
const INVALID_FOLDER_CHARS = /[\\/:*?"<>|]/g;

export function sanitizeFolderName(name: string): string {
  return name.replace(INVALID_FOLDER_CHARS, ' ').replace(/\s+/g, ' ').trim() || 'Unnamed';
}

/**
 * Builds the full list of folder paths (as flat hierarchy arrays)
 * relative to the engagement root folder.
 *
 * Each entry is an array of segments from the engagement root downward,
 * e.g. ["Contracts", "Tour"] for the Tour subfolder under Contracts.
 */
export function buildEngagementFolderHierarchies(
  year: string,
  marketName: string | null,
  attractionName: string | null,
): string[][] {
  const market = marketName ? sanitizeFolderName(marketName) : 'Unknown Market';
  const attraction = attractionName ? sanitizeFolderName(attractionName) : 'Unknown Attraction';
  const rootSegments = [year, market, attraction];

  const hierarchies: string[][] = [];

  for (const [parent, children] of Object.entries(ENGAGEMENT_FOLDER_STRUCTURE)) {
    hierarchies.push([...rootSegments, parent]);
    for (const child of children) {
      hierarchies.push([...rootSegments, parent, child]);
    }
  }

  return hierarchies;
}

/**
 * Sanitized folder name for the engagement root folder
 * (the Attraction-level folder under Year/Market/).
 */
export function buildEngagementRootFolderName(
  attractionName: string | null,
  tourName: string | null,
  venueName: string | null,
): string {
  const parts = [
    attractionName ? sanitizeFolderName(attractionName) : null,
    tourName ? sanitizeFolderName(tourName) : null,
    venueName ? sanitizeFolderName(venueName) : null,
  ].filter(Boolean);
  return parts.join(' - ') || 'Engagement';
}
