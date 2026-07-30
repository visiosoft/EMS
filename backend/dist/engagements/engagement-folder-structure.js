"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENGAGEMENT_FOLDER_STRUCTURE = void 0;
exports.sanitizeFolderName = sanitizeFolderName;
exports.buildEngagementFolderHierarchies = buildEngagementFolderHierarchies;
exports.buildEngagementRootFolderName = buildEngagementRootFolderName;
exports.ENGAGEMENT_FOLDER_STRUCTURE = {
    Contracts: ['Tour', 'Venue', 'Partner'],
    Booking: ['Tour', 'Venue'],
    Ticketing: [],
    Marketing: [],
    Advance: ['Tour', 'Venue'],
    Settlement: ['Tour', 'Venue', 'Partner'],
};
const INVALID_FOLDER_CHARS = /[\\/:*?"<>|]/g;
function sanitizeFolderName(name) {
    return name.replace(INVALID_FOLDER_CHARS, ' ').replace(/\s+/g, ' ').trim() || 'Unnamed';
}
function buildEngagementFolderHierarchies(year, marketName, attractionName) {
    const market = marketName ? sanitizeFolderName(marketName) : 'Unknown Market';
    const attraction = attractionName ? sanitizeFolderName(attractionName) : 'Unknown Attraction';
    const rootSegments = [year, market, attraction];
    const hierarchies = [];
    for (const [parent, children] of Object.entries(exports.ENGAGEMENT_FOLDER_STRUCTURE)) {
        hierarchies.push([...rootSegments, parent]);
        for (const child of children) {
            hierarchies.push([...rootSegments, parent, child]);
        }
    }
    return hierarchies;
}
function buildEngagementRootFolderName(attractionName, tourName, venueName) {
    const parts = [
        attractionName ? sanitizeFolderName(attractionName) : null,
        tourName ? sanitizeFolderName(tourName) : null,
        venueName ? sanitizeFolderName(venueName) : null,
    ].filter(Boolean);
    return parts.join(' - ') || 'Engagement';
}
//# sourceMappingURL=engagement-folder-structure.js.map